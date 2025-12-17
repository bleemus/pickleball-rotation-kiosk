#!/bin/bash
# Pickleball Kiosk - Diagnostics Script
# Run this on your Raspberry Pi to diagnose kiosk mode issues

set -e

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
AUTOSTART_FILE="$HOME/.config/lxsession/LXDE-pi/autostart"
if [ -f "$AUTOSTART_FILE" ]; then
    echo -e "${GREEN}✓ Autostart file exists${NC}"
    echo "Contents:"
    cat "$AUTOSTART_FILE"
    echo ""
else
    echo -e "${RED}✗ Autostart file NOT found at: $AUTOSTART_FILE${NC}"
    echo ""
fi

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
    cd "$HOME/pickleball-rotation-kiosk"
    docker-compose ps
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

# 4. Check Chromium installation
echo -e "${BLUE}[4] Checking Chromium browser...${NC}"
if command -v chromium-browser &> /dev/null; then
    echo -e "${GREEN}✓ Chromium is installed${NC}"
    chromium-browser --version
else
    echo -e "${RED}✗ Chromium is NOT installed${NC}"
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
echo "   cd ~/pickleball-rotation-kiosk && ./install.sh"
echo ""
echo "2. If Docker services are not running:"
echo "   cd ~/pickleball-rotation-kiosk"
echo "   docker-compose down"
echo "   docker-compose up -d"
echo ""
echo "3. If services take too long to start:"
echo "   Edit autostart file and increase sleep time:"
echo "   nano ~/.config/lxsession/LXDE-pi/autostart"
echo "   Change: @bash -c \"sleep 15\" to @bash -c \"sleep 30\""
echo ""
echo "4. If Chromium is not installed:"
echo "   sudo apt-get install -y chromium-browser"
echo ""
echo "5. Always reboot after making changes:"
echo "   sudo reboot"
echo ""
