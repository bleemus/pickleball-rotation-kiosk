#!/bin/bash
# Pickleball Kiosk - Diagnostics Script
# Run this on your Raspberry Pi to diagnose kiosk mode issues

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
echo "  Pickleball Kiosk - Diagnostics"
echo "============================================"
echo ""

# 1. Check autostart configuration
echo -e "${BLUE}[1] Checking autostart configuration...${NC}"

# Check Labwc (Wayland - newer Pi OS)
LABWC_FILE="$ACTUAL_HOME/.config/labwc/autostart"
if [ -f "$LABWC_FILE" ]; then
    echo -e "${GREEN}✓ Labwc autostart file exists${NC}"
    echo "Location: $LABWC_FILE"
    echo "Contents:"
    cat "$LABWC_FILE"
    echo ""
else
    echo -e "${YELLOW}⚠ Labwc autostart NOT found at: $LABWC_FILE${NC}"
    echo ""
fi

# Check LXDE (X11 - older Pi OS)
LXDE_FILE="$ACTUAL_HOME/.config/lxsession/LXDE-pi/autostart"
if [ -f "$LXDE_FILE" ]; then
    echo -e "${GREEN}✓ LXDE autostart file exists${NC}"
    echo "Location: $LXDE_FILE"
    echo "Contents:"
    cat "$LXDE_FILE"
    echo ""
else
    echo -e "${YELLOW}⚠ LXDE autostart NOT found at: $LXDE_FILE${NC}"
    echo ""
fi

# Show which desktop session is active
echo "Current desktop session:"
if [ -n "$XDG_CURRENT_DESKTOP" ]; then
    echo "  XDG_CURRENT_DESKTOP=$XDG_CURRENT_DESKTOP"
fi
if [ -n "$DESKTOP_SESSION" ]; then
    echo "  DESKTOP_SESSION=$DESKTOP_SESSION"
fi
if [ -n "$XDG_SESSION_TYPE" ]; then
    echo "  XDG_SESSION_TYPE=$XDG_SESSION_TYPE"
fi
echo ""

# 2. Check Docker services
echo -e "${BLUE}[2] Checking Docker services...${NC}"
if command -v docker &> /dev/null; then
    echo -e "${GREEN}✓ Docker is installed${NC}"

    if sudo systemctl is-active --quiet docker; then
        echo -e "${GREEN}✓ Docker service is running${NC}"
    else
        echo -e "${RED}✗ Docker service is NOT running${NC}"
    fi

    echo ""
    echo "Docker Compose status:"
    if cd "$ACTUAL_HOME/pickleball-rotation-kiosk" 2>/dev/null; then
        docker-compose ps
    else
        echo -e "${RED}✗ Could not find project directory at $ACTUAL_HOME/pickleball-rotation-kiosk${NC}"
    fi
    echo ""
else
    echo -e "${RED}✗ Docker is NOT installed${NC}"
    echo ""
fi

# 3. Check application accessibility
echo -e "${BLUE}[3] Checking application accessibility...${NC}"
HOSTNAME=$(hostname)
MDNS_NAME="${HOSTNAME}.local"

echo "Testing URLs:"
echo "  - http://localhost/"
echo "  - http://$MDNS_NAME/"
echo ""

if command -v curl &> /dev/null; then
    if curl -s -o /dev/null -w "%{http_code}" http://localhost/ | grep -q "200\|301\|302"; then
        echo -e "${GREEN}✓ Application accessible at http://localhost/${NC}"
    else
        echo -e "${RED}✗ Application NOT accessible at http://localhost/${NC}"
    fi

    if curl -s -o /dev/null -w "%{http_code}" http://$MDNS_NAME/ | grep -q "200\|301\|302"; then
        echo -e "${GREEN}✓ Application accessible at http://$MDNS_NAME/${NC}"
    else
        echo -e "${YELLOW}⚠ Application NOT accessible at http://$MDNS_NAME/${NC}"
        echo "  (This might work from other devices)"
    fi
else
    echo -e "${YELLOW}⚠ curl not installed, skipping URL checks${NC}"
fi
echo ""

# 4. Check Firefox installation
echo -e "${BLUE}[4] Checking Firefox browser...${NC}"
if command -v firefox-esr &> /dev/null || command -v firefox &> /dev/null; then
    echo -e "${GREEN}✓ Firefox is installed${NC}"
    if command -v firefox-esr &> /dev/null; then
        firefox-esr --version
    else
        firefox --version
    fi
else
    echo -e "${RED}✗ Firefox is NOT installed${NC}"
fi
echo ""

# 5. Check screen blanking settings
echo -e "${BLUE}[5] Checking screen blanking settings...${NC}"
if [ -f /etc/lightdm/lightdm.conf ]; then
    if sudo grep -q "xserver-command=X -s 0 -dpms" /etc/lightdm/lightdm.conf; then
        echo -e "${GREEN}✓ Screen blanking disabled in lightdm${NC}"
    else
        echo -e "${YELLOW}⚠ Screen blanking NOT disabled in lightdm${NC}"
    fi
else
    echo -e "${YELLOW}⚠ lightdm.conf not found${NC}"
fi
echo ""

# 6. Check systemd service
echo -e "${BLUE}[6] Checking systemd service...${NC}"
if sudo systemctl list-unit-files | grep -q "pickleball-kiosk.service"; then
    echo -e "${GREEN}✓ pickleball-kiosk.service exists${NC}"

    if sudo systemctl is-enabled --quiet pickleball-kiosk.service; then
        echo -e "${GREEN}✓ Service is enabled (will start on boot)${NC}"
    else
        echo -e "${RED}✗ Service is NOT enabled${NC}"
    fi

    if sudo systemctl is-active --quiet pickleball-kiosk.service; then
        echo -e "${GREEN}✓ Service is active${NC}"
    else
        echo -e "${YELLOW}⚠ Service is NOT active${NC}"
    fi
else
    echo -e "${RED}✗ pickleball-kiosk.service NOT found${NC}"
fi
echo ""

echo "============================================"
echo "  Diagnostics Complete"
echo "============================================"
echo ""
echo "Common Issues and Solutions:"
echo ""
echo "1. If autostart file is missing or incorrect:"
echo "   cd $ACTUAL_HOME/pickleball-rotation-kiosk && ./install.sh"
echo ""
echo "2. If Docker services are not running:"
echo "   cd $ACTUAL_HOME/pickleball-rotation-kiosk"
echo "   docker-compose down"
echo "   docker-compose up -d"
echo ""
echo "3. If services take too long to start:"
echo "   Edit autostart file and increase sleep time:"
echo "   nano ~/.config/lxsession/LXDE-pi/autostart"
echo "   Change: @bash -c \"sleep 15\" to @bash -c \"sleep 30\""
echo ""
echo "4. If Firefox is not installed:"
echo "   sudo apt-get install -y firefox-esr"
echo ""
echo "5. Always reboot after making changes:"
echo "   sudo reboot"
echo ""
