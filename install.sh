#!/bin/bash
# Pickleball Kiosk - Local Installation Script
# Run this script directly on the Raspberry Pi after cloning the repository

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

# Get current hostname
CURRENT_HOSTNAME=$(hostname)
MDNS_NAME="${CURRENT_HOSTNAME}.local"

echo "Installing on: $CURRENT_HOSTNAME"
echo "Access at: http://$MDNS_NAME"
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
echo "[STEP 1/6] Updating system packages..."
sudo apt-get update -qq
echo -e "${GREEN}✓ System updated${NC}"
echo ""

# Install required packages
echo "[STEP 2/6] Installing required packages..."
sudo apt-get install -y unclutter firefox-esr
echo -e "${GREEN}✓ Packages installed (unclutter, firefox-esr)${NC}"
echo ""

# Install Docker
if command -v docker &> /dev/null; then
    echo "[STEP 3/6] Docker already installed"
    echo -e "${GREEN}✓ Docker version: $(docker --version)${NC}"
else
    echo "[STEP 3/6] Installing Docker..."
    echo "This may take 5-10 minutes..."
    curl -fsSL https://get.docker.com -o /tmp/get-docker.sh
    sudo sh /tmp/get-docker.sh
    sudo usermod -aG docker $ACTUAL_USER
    rm /tmp/get-docker.sh
    sudo systemctl enable docker
    sudo systemctl start docker
    echo -e "${GREEN}✓ Docker installed${NC}"
fi
echo ""

# Install Docker Compose
if command -v docker-compose &> /dev/null; then
    echo "[STEP 4/6] Docker Compose already installed"
    echo -e "${GREEN}✓ Docker Compose version: $(docker-compose --version)${NC}"
else
    echo "[STEP 4/6] Installing Docker Compose..."
    COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep 'tag_name' | cut -d'"' -f4)
    sudo curl -L "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    echo -e "${GREEN}✓ Docker Compose installed (${COMPOSE_VERSION})${NC}"
fi
echo ""

# Build and start application
echo "[STEP 5/6] Building and starting application..."
echo "This may take 5-10 minutes..."
cd "$SCRIPT_DIR"

# Use make commands which handle HOST_IP properly
if groups | grep -q docker; then
    make build
    make up
else
    # User not in docker group yet (needs re-login), use sudo
    sudo make build
    sudo make up
fi

echo -e "${GREEN}✓ Application built and started${NC}"
echo ""

# Create systemd service for auto-start
echo "[STEP 6/6] Configuring auto-start..."

sudo tee /etc/systemd/system/pickleball-kiosk.service > /dev/null <<SERVICE
[Unit]
Description=Pickleball Kiosk Application
After=docker.service network-online.target
Requires=docker.service
Wants=network-online.target

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$SCRIPT_DIR
ExecStart=/usr/bin/make up
ExecStop=/usr/bin/make down
User=$ACTUAL_USER

[Install]
WantedBy=multi-user.target
SERVICE

sudo systemctl enable pickleball-kiosk.service
echo -e "${GREEN}✓ Auto-start configured${NC}"
echo ""

# Configure kiosk mode
echo "Configuring kiosk mode..."

# Detect desktop environment (Labwc for newer Pi OS, LXDE for older)
# Configure both to be safe, as the active one depends on lightdm config

# Configure for Labwc (Wayland - newer Raspberry Pi OS)
echo "Setting up Labwc (Wayland) autostart..."
LABWC_DIR="$ACTUAL_HOME/.config/labwc"
mkdir -p "$LABWC_DIR"

if [ -f "$LABWC_DIR/autostart" ]; then
    cp "$LABWC_DIR/autostart" "$LABWC_DIR/autostart.backup"
fi

cat > "$LABWC_DIR/autostart" <<'LABWC_EOF'
#!/bin/bash

# Wait for Docker containers to be ready
sleep 20

# Launch Firefox in kiosk mode (use localhost since we're on the Pi itself)
firefox-esr --kiosk http://localhost/spectator &
LABWC_EOF

chmod +x "$LABWC_DIR/autostart"

echo -e "${GREEN}✓ Labwc autostart configured${NC}"

# Configure for LXDE (X11 - older Raspberry Pi OS)
echo "Setting up LXDE (X11) autostart..."
LXDE_DIR="$ACTUAL_HOME/.config/lxsession/LXDE-pi"
mkdir -p "$LXDE_DIR"

if [ -f "$LXDE_DIR/autostart" ]; then
    cp "$LXDE_DIR/autostart" "$LXDE_DIR/autostart.backup"
fi

cat > "$LXDE_DIR/autostart" <<EOF
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
@bash -c "sleep 20"

# Launch spectator view in kiosk mode (use localhost since we're on the Pi itself)
@firefox-esr --kiosk http://localhost/spectator
EOF

echo -e "${GREEN}✓ LXDE autostart configured${NC}"
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
echo "  ✓ Required packages installed (unclutter, firefox-esr)${NC}"
echo "  ✓ Docker and Docker Compose installed"
echo "  ✓ Application built and running"
echo "  ✓ Kiosk mode configured (Labwc + LXDE)"
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
echo "  Stop:    cd $SCRIPT_DIR && make down"
echo "  Start:   cd $SCRIPT_DIR && make up"
echo "  Restart: cd $SCRIPT_DIR && make restart"
echo "  Logs:    cd $SCRIPT_DIR && make logs"
echo ""
