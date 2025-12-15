#!/bin/bash
# Pickleball Kiosk - Local Installation Script
# Run this script directly on the Raspberry Pi after cloning the repository

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "============================================"
echo "  Pickleball Kiosk - Local Install"
echo "============================================"
echo ""

# Check if running on Raspberry Pi
if [ ! -f /proc/device-tree/model ] || ! grep -q "Raspberry Pi" /proc/device-tree/model 2>/dev/null; then
    echo -e "${YELLOW}Warning: This doesn't appear to be a Raspberry Pi${NC}"
    read -p "Continue anyway? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Verify we're in the application directory
if [ ! -f "$SCRIPT_DIR/docker-compose.yml" ] || [ ! -f "$SCRIPT_DIR/Makefile" ]; then
    echo -e "${RED}Error: This script must be run from the pickleball-rotation-kiosk directory${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Found application files${NC}"
echo ""

# Get hostname (optional)
echo "Step 1: Configure Hostname (Optional)"
echo "--------------------------------------"
CURRENT_HOSTNAME=$(hostname)
echo "Current hostname: $CURRENT_HOSTNAME"
echo ""
read -p "Change hostname? (y/n): " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Choose a hostname for network access (e.g., 'pickleball')"
    echo "Requirements: lowercase letters, numbers, hyphens only"
    echo ""

    while true; do
        read -p "Enter new hostname: " NEW_HOSTNAME
        if [[ "$NEW_HOSTNAME" =~ ^[a-z][a-z0-9-]*$ ]]; then
            break
        else
            echo -e "${RED}Invalid hostname. Use lowercase letters, numbers, and hyphens only.${NC}"
        fi
    done

    echo ""
    echo "Setting hostname to $NEW_HOSTNAME..."
    echo "$NEW_HOSTNAME" | sudo tee /etc/hostname > /dev/null
    sudo sed -i "s/127.0.1.1.*$CURRENT_HOSTNAME/127.0.1.1\t$NEW_HOSTNAME/" /etc/hosts
    if ! grep -q "127.0.1.1" /etc/hosts; then
        echo "127.0.1.1	$NEW_HOSTNAME" | sudo tee -a /etc/hosts > /dev/null
    fi
    sudo hostnamectl set-hostname "$NEW_HOSTNAME" 2>/dev/null || true
    echo -e "${GREEN}✓ Hostname updated to $NEW_HOSTNAME${NC}"
    MDNS_NAME="${NEW_HOSTNAME}.local"
else
    NEW_HOSTNAME=$CURRENT_HOSTNAME
    MDNS_NAME="${NEW_HOSTNAME}.local"
fi

echo ""
echo "Installation will proceed with:"
echo "  Hostname: $NEW_HOSTNAME"
echo "  Network: http://$MDNS_NAME"
echo ""
read -p "Continue? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Installation cancelled."
    exit 1
fi

echo ""
echo "Starting installation..."
echo ""

# Update system
echo "[STEP 1/7] Updating system packages..."
sudo apt-get update -qq
echo -e "${GREEN}✓ System updated${NC}"
echo ""

# Install required packages
echo "[STEP 2/7] Installing required packages..."
echo "This may take 5-10 minutes..."
sudo apt-get install -y avahi-daemon chromium-browser unclutter curl git
sudo systemctl enable avahi-daemon
sudo systemctl start avahi-daemon
echo -e "${GREEN}✓ Packages installed${NC}"
echo ""

# Unblock WiFi (in case of rfkill)
echo "[STEP 3/7] Configuring WiFi..."
sudo rfkill unblock wifi 2>/dev/null || true
sudo rfkill unblock all 2>/dev/null || true
echo -e "${GREEN}✓ WiFi unblocked${NC}"
echo ""

# Install Docker
if command -v docker &> /dev/null; then
    echo "[STEP 4/7] Docker already installed"
    echo -e "${GREEN}✓ Docker version: $(docker --version)${NC}"
else
    echo "[STEP 4/7] Installing Docker..."
    echo "This may take 5-10 minutes..."
    curl -fsSL https://get.docker.com -o /tmp/get-docker.sh
    sudo sh /tmp/get-docker.sh
    sudo usermod -aG docker $USER
    rm /tmp/get-docker.sh
    sudo systemctl enable docker
    sudo systemctl start docker
    echo -e "${GREEN}✓ Docker installed${NC}"
fi
echo ""

# Install Docker Compose
if command -v docker-compose &> /dev/null; then
    echo "[STEP 5/7] Docker Compose already installed"
    echo -e "${GREEN}✓ Docker Compose version: $(docker-compose --version)${NC}"
else
    echo "[STEP 5/7] Installing Docker Compose..."
    COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep 'tag_name' | cut -d'"' -f4)
    sudo curl -L "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    echo -e "${GREEN}✓ Docker Compose installed (${COMPOSE_VERSION})${NC}"
fi
echo ""

# Build and start application
echo "[STEP 6/7] Building and starting application..."
echo "This may take 5-10 minutes..."
cd "$SCRIPT_DIR"

# Need to logout and login for docker group to take effect, so use newgrp or sudo
if groups | grep -q docker; then
    docker-compose build
    docker-compose up -d
else
    # User not in docker group yet (needs re-login), use sudo
    sudo docker-compose build
    sudo docker-compose up -d
fi

echo -e "${GREEN}✓ Application built and started${NC}"
echo ""

# Create systemd service for auto-start
echo "[STEP 7/7] Configuring auto-start..."

sudo tee /etc/systemd/system/pickleball-kiosk.service > /dev/null <<SERVICE
[Unit]
Description=Pickleball Kiosk Application
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$SCRIPT_DIR
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
User=$USER

[Install]
WantedBy=multi-user.target
SERVICE

sudo systemctl enable pickleball-kiosk.service
echo -e "${GREEN}✓ Auto-start configured${NC}"
echo ""

# Configure kiosk mode
echo "Configuring kiosk mode..."

AUTOSTART_DIR="$HOME/.config/lxsession/LXDE-pi"
mkdir -p "$AUTOSTART_DIR"

if [ -f "$AUTOSTART_DIR/autostart" ]; then
    cp "$AUTOSTART_DIR/autostart" "$AUTOSTART_DIR/autostart.backup"
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

# Wait for application to start
@bash -c "sleep 15"

# Launch spectator view in kiosk mode
@chromium-browser --noerrdialogs --disable-infobars --kiosk http://$MDNS_NAME/spectator
EOF

echo -e "${GREEN}✓ Kiosk mode configured${NC}"
echo ""

# Disable screen blanking in lightdm
if [ -f /etc/lightdm/lightdm.conf ]; then
    sudo cp /etc/lightdm/lightdm.conf /etc/lightdm/lightdm.conf.backup

    if sudo grep -q "^xserver-command=" /etc/lightdm/lightdm.conf; then
        sudo sed -i 's/^xserver-command=.*/xserver-command=X -s 0 -dpms/' /etc/lightdm/lightdm.conf
    else
        sudo sed -i '/^\[Seat:\*\]/a xserver-command=X -s 0 -dpms' /etc/lightdm/lightdm.conf
    fi
    echo -e "${GREEN}✓ Screen blanking disabled${NC}"
fi

echo ""
echo "============================================"
echo "         INSTALLATION COMPLETE! ✓"
echo "============================================"
echo ""
echo "Summary:"
echo "  ✓ System packages installed"
echo "  ✓ Docker and Docker Compose installed"
echo "  ✓ Application built and running"
echo "  ✓ Kiosk mode configured"
echo "  ✓ Auto-start enabled"
echo ""
echo "Access URLs:"
echo "  • Admin: http://$MDNS_NAME/"
echo "  • Spectator: http://$MDNS_NAME/spectator"
echo ""
echo "============================================"
echo "           PLEASE REBOOT NOW"
echo "============================================"
echo ""
echo "After reboot, the spectator display will"
echo "launch automatically in fullscreen."
echo ""
echo "To reboot now, run:"
echo "  sudo reboot"
echo ""
echo "Management commands:"
echo "  Stop:    cd $SCRIPT_DIR && docker-compose down"
echo "  Start:   cd $SCRIPT_DIR && docker-compose up -d"
echo "  Restart: cd $SCRIPT_DIR && docker-compose restart"
echo "  Logs:    cd $SCRIPT_DIR && docker-compose logs -f"
echo ""
