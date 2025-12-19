#!/bin/bash
# Pickleball Kiosk - Rollback Script
# This script undoes the changes made by install.sh

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
echo "  Pickleball Kiosk - Rollback Script"
echo "============================================"
echo ""
echo -e "${YELLOW}WARNING: This will remove the Pickleball Kiosk installation${NC}"
echo ""

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

read -p "Are you sure you want to continue? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Rollback cancelled."
    exit 0
fi

echo ""
echo "Starting rollback..."
echo ""

# Step 1: Stop and disable systemd service
echo "[STEP 1/7] Removing systemd service..."
if [ -f /etc/systemd/system/pickleball-kiosk.service ]; then
    sudo systemctl stop pickleball-kiosk.service 2>/dev/null || true
    sudo systemctl disable pickleball-kiosk.service 2>/dev/null || true
    sudo rm /etc/systemd/system/pickleball-kiosk.service
    sudo systemctl daemon-reload
    echo -e "${GREEN}✓ Systemd service removed${NC}"
else
    echo -e "${YELLOW}⊘ Systemd service not found (already removed)${NC}"
fi
echo ""

# Step 2: Stop and remove Docker containers
echo "[STEP 2/7] Stopping Docker containers..."
cd "$SCRIPT_DIR"
if [ -f Makefile ]; then
    # Try without sudo first
    if groups | grep -q docker; then
        make clean 2>/dev/null || true
    else
        sudo make clean 2>/dev/null || true
    fi
    echo -e "${GREEN}✓ Docker containers stopped and removed${NC}"
else
    echo -e "${YELLOW}⊘ Makefile not found${NC}"
fi
echo ""

# Step 3: Remove Docker images (optional)
echo "[STEP 3/7] Docker images cleanup..."
read -p "Remove Docker images for this project? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if groups | grep -q docker; then
        docker images | grep pickleball | awk '{print $3}' | xargs -r docker rmi -f 2>/dev/null || true
        docker images | grep -E 'redis.*7-alpine|node.*20-alpine|nginx.*alpine' | awk '{print $3}' | xargs -r docker rmi -f 2>/dev/null || true
    else
        sudo docker images | grep pickleball | awk '{print $3}' | xargs -r sudo docker rmi -f 2>/dev/null || true
        sudo docker images | grep -E 'redis.*7-alpine|node.*20-alpine|nginx.*alpine' | awk '{print $3}' | xargs -r sudo docker rmi -f 2>/dev/null || true
    fi
    echo -e "${GREEN}✓ Docker images removed${NC}"
else
    echo -e "${YELLOW}⊘ Skipped Docker image removal${NC}"
fi
echo ""

# Step 4: Restore autostart configuration
echo "[STEP 4/7] Restoring autostart configuration..."

# Restore Labwc autostart (Wayland)
LABWC_DIR="$ACTUAL_HOME/.config/labwc"
if [ -f "$LABWC_DIR/autostart.backup" ]; then
    mv "$LABWC_DIR/autostart.backup" "$LABWC_DIR/autostart"
    echo -e "${GREEN}✓ Labwc autostart restored from backup${NC}"
elif [ -f "$LABWC_DIR/autostart" ]; then
    rm "$LABWC_DIR/autostart"
    echo -e "${GREEN}✓ Labwc autostart removed${NC}"
else
    echo -e "${YELLOW}⊘ No Labwc autostart to restore${NC}"
fi

# Restore LXDE autostart (X11)
LXDE_DIR="$ACTUAL_HOME/.config/lxsession/LXDE-pi"
if [ -f "$LXDE_DIR/autostart.backup" ]; then
    mv "$LXDE_DIR/autostart.backup" "$LXDE_DIR/autostart"
    echo -e "${GREEN}✓ LXDE autostart restored from backup${NC}"
elif [ -f "$LXDE_DIR/autostart" ]; then
    rm "$LXDE_DIR/autostart"
    echo -e "${GREEN}✓ LXDE autostart removed${NC}"
else
    echo -e "${YELLOW}⊘ No LXDE autostart to restore${NC}"
fi
echo ""

# Step 5: Restore lightdm configuration
echo "[STEP 5/7] Restoring lightdm configuration..."
if [ -f /etc/lightdm/lightdm.conf.backup ]; then
    sudo mv /etc/lightdm/lightdm.conf.backup /etc/lightdm/lightdm.conf
    echo -e "${GREEN}✓ Lightdm configuration restored from backup${NC}"
else
    echo -e "${YELLOW}⊘ No lightdm backup found${NC}"
fi
echo ""

# Step 6: Remove Docker and Docker Compose (optional)
echo "[STEP 6/7] Docker and Docker Compose removal..."
echo "This will remove Docker and Docker Compose from your system."
echo "Only do this if you don't use Docker for anything else!"
read -p "Remove Docker and Docker Compose? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Stop Docker service
    sudo systemctl stop docker 2>/dev/null || true
    sudo systemctl disable docker 2>/dev/null || true

    # Remove Docker Compose
    if [ -f /usr/local/bin/docker-compose ]; then
        sudo rm /usr/local/bin/docker-compose
        echo -e "${GREEN}✓ Docker Compose removed${NC}"
    fi

    # Remove Docker
    sudo apt-get purge -y docker-ce docker-ce-cli containerd.io 2>/dev/null || true
    sudo apt-get autoremove -y 2>/dev/null || true

    # Remove Docker directories
    sudo rm -rf /var/lib/docker
    sudo rm -rf /var/lib/containerd

    # Remove user from docker group
    sudo deluser $ACTUAL_USER docker 2>/dev/null || true

    echo -e "${GREEN}✓ Docker removed${NC}"
else
    echo -e "${YELLOW}⊘ Skipped Docker removal${NC}"
fi
echo ""

# Step 7: Remove packages (optional)
echo "[STEP 7/7] Package removal..."
read -p "Remove installed packages (unclutter, firefox-esr)? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    sudo apt-get remove -y unclutter firefox-esr 2>/dev/null || true
    sudo apt-get autoremove -y 2>/dev/null || true
    echo -e "${GREEN}✓ Packages removed${NC}"
else
    echo -e "${YELLOW}⊘ Skipped package removal${NC}"
fi
echo ""

echo "============================================"
echo "         ROLLBACK COMPLETE! ✓"
echo "============================================"
echo ""
echo "Summary:"
echo "  ✓ Systemd service removed"
echo "  ✓ Docker containers stopped"
echo "  ✓ Kiosk mode configuration restored"
echo "  ✓ Screen blanking settings restored"
echo ""
echo "What was NOT removed:"
echo "  • Application files in $SCRIPT_DIR"
echo "  • System package updates"
echo ""
echo "============================================"
echo "           REBOOT RECOMMENDED"
echo "============================================"
echo ""
echo "A reboot is recommended to ensure all changes"
echo "take effect, especially if you removed Docker."
echo ""
echo "To reboot now, run:"
echo "  sudo reboot"
echo ""
