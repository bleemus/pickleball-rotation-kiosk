#!/bin/bash
# Pickleball Kiosk - Fix Kiosk Mode Script
# Run this on your Raspberry Pi to fix kiosk mode issues

set -e

# Get the actual user's home directory (handles sudo correctly)
if [ -n "$SUDO_USER" ]; then
    ACTUAL_USER="$SUDO_USER"
    ACTUAL_HOME=$(getent passwd "$SUDO_USER" | cut -d: -f6)
else
    ACTUAL_USER="$USER"
    ACTUAL_HOME="$HOME"
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "============================================"
echo "  Pickleball Kiosk - Fix Kiosk Mode"
echo "============================================"
echo ""

# Get current hostname
CURRENT_HOSTNAME=$(hostname)
MDNS_NAME="${CURRENT_HOSTNAME}.local"

echo "Hostname: $CURRENT_HOSTNAME"
echo "mDNS Name: $MDNS_NAME"
echo ""

# 1. Install Chromium if missing
echo -e "${BLUE}[1/6] Checking Chromium installation...${NC}"
if ! command -v chromium-browser &> /dev/null; then
    echo "Installing Chromium..."
    sudo apt-get update -qq
    sudo apt-get install -y chromium-browser
    echo -e "${GREEN}✓ Chromium installed${NC}"
else
    echo -e "${GREEN}✓ Chromium already installed${NC}"
fi
echo ""

# 2. Install unclutter if missing
echo -e "${BLUE}[2/6] Checking unclutter installation...${NC}"
if ! command -v unclutter &> /dev/null; then
    echo "Installing unclutter..."
    sudo apt-get install -y unclutter
    echo -e "${GREEN}✓ unclutter installed${NC}"
else
    echo -e "${GREEN}✓ unclutter already installed${NC}"
fi
echo ""

# 3. Fix autostart configuration
echo -e "${BLUE}[3/6] Fixing autostart configuration...${NC}"
AUTOSTART_DIR="$ACTUAL_HOME/.config/lxsession/LXDE-pi"
mkdir -p "$AUTOSTART_DIR"

# Backup existing file
if [ -f "$AUTOSTART_DIR/autostart" ]; then
    cp "$AUTOSTART_DIR/autostart" "$AUTOSTART_DIR/autostart.backup.$(date +%s)"
fi

cat > "$AUTOSTART_DIR/autostart" <<EOF
@lxpanel --profile LXDE-pi
@pcmanfm --desktop --profile LXDE-pi
@xscreensaver -no-splash

# Disable screen blanking
@xset s off
@xset -dpms
@xset s noblank

# Hide cursor
@unclutter -idle 0.5 -root

# Wait for application to start (increased to 30 seconds for reliability)
@bash -c "sleep 30"

# Launch spectator view in kiosk mode
@chromium-browser --noerrdialogs --disable-infobars --kiosk http://$MDNS_NAME/spectator
EOF

echo -e "${GREEN}✓ Autostart configured${NC}"
echo "  Wait time: 30 seconds"
echo "  URL: http://$MDNS_NAME/spectator"
echo ""

# 4. Fix screen blanking in lightdm
echo -e "${BLUE}[4/6] Fixing screen blanking settings...${NC}"
if [ -f /etc/lightdm/lightdm.conf ]; then
    sudo cp /etc/lightdm/lightdm.conf /etc/lightdm/lightdm.conf.backup.$(date +%s)

    # Check if xserver-command line exists
    if sudo grep -q "^xserver-command=" /etc/lightdm/lightdm.conf; then
        sudo sed -i 's/^xserver-command=.*/xserver-command=X -s 0 -dpms/' /etc/lightdm/lightdm.conf
    else
        # Add it under [Seat:*] section
        sudo sed -i '/^\[Seat:\*\]/a xserver-command=X -s 0 -dpms' /etc/lightdm/lightdm.conf
    fi
    echo -e "${GREEN}✓ Screen blanking disabled${NC}"
else
    echo -e "${YELLOW}⚠ lightdm.conf not found (might not be needed)${NC}"
fi
echo ""

# 5. Restart Docker services
echo -e "${BLUE}[5/6] Restarting Docker services...${NC}"
cd "$ACTUAL_HOME/pickleball-rotation-kiosk"

if docker-compose ps | grep -q "Up"; then
    echo "Restarting services..."
    docker-compose restart
else
    echo "Starting services..."
    docker-compose up -d
fi

# Wait a moment and check status
sleep 3
docker-compose ps

echo -e "${GREEN}✓ Docker services restarted${NC}"
echo ""

# 6. Test application accessibility
echo -e "${BLUE}[6/6] Testing application...${NC}"
sleep 5  # Give services time to fully start

if command -v curl &> /dev/null; then
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/ || echo "000")
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "301" ] || [ "$HTTP_CODE" = "302" ]; then
        echo -e "${GREEN}✓ Application is accessible at http://localhost/${NC}"
    else
        echo -e "${RED}✗ Application not responding (HTTP $HTTP_CODE)${NC}"
        echo "  Run 'docker-compose logs' to check for errors"
    fi
else
    echo -e "${YELLOW}⚠ curl not installed, skipping URL test${NC}"
fi
echo ""

echo "============================================"
echo "         FIX COMPLETE! ✓"
echo "============================================"
echo ""
echo "Summary of changes:"
echo "  ✓ Chromium installed (if needed)"
echo "  ✓ unclutter installed (if needed)"
echo "  ✓ Autostart configured with 30-second delay"
echo "  ✓ Screen blanking disabled"
echo "  ✓ Docker services restarted"
echo ""
echo "Access URLs:"
echo "  • Admin: http://$MDNS_NAME/"
echo "  • Spectator: http://$MDNS_NAME/spectator"
echo ""
echo "============================================"
echo "           PLEASE REBOOT NOW"
echo "============================================"
echo ""
echo "The kiosk mode will start after reboot."
echo ""
echo "To reboot now, run:"
echo "  sudo reboot"
echo ""
echo "To test without rebooting:"
echo "  1. Press Ctrl+Alt+F1 to switch to terminal"
echo "  2. Press Ctrl+Alt+F7 to return to desktop"
echo "  3. The autostart should trigger"
echo ""
echo "If it still doesn't work after reboot:"
echo "  1. Run diagnostics: ./diagnose-kiosk.sh"
echo "  2. Check logs: docker-compose logs -f"
echo "  3. Manually test: chromium-browser --kiosk http://$MDNS_NAME/spectator"
echo ""
