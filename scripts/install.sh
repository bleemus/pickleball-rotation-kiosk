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
echo "[STEP 1/8] Updating system packages..."
sudo apt-get update -qq
echo -e "${GREEN}✓ System updated${NC}"
echo ""

# Install required packages
echo "[STEP 2/8] Installing required packages..."
sudo apt-get install -y unclutter firefox-esr
echo -e "${GREEN}✓ Packages installed (unclutter, firefox-esr)${NC}"
echo ""

# Install Docker
if command -v docker &> /dev/null; then
    echo "[STEP 3/8] Docker already installed"
    echo -e "${GREEN}✓ Docker version: $(docker --version)${NC}"
else
    echo "[STEP 3/8] Installing Docker..."
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
    echo "[STEP 4/8] Docker Compose already installed"
    echo -e "${GREEN}✓ Docker Compose version: $(docker-compose --version)${NC}"
else
    echo "[STEP 4/8] Installing Docker Compose..."
    COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep 'tag_name' | cut -d'"' -f4)
    sudo curl -L "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    echo -e "${GREEN}✓ Docker Compose installed (${COMPOSE_VERSION})${NC}"
fi
echo ""

# Configure rsyslog for log forwarding
echo "[STEP 5/8] Configuring rsyslog for log collection..."

# Enable UDP syslog input (for Docker syslog driver)
if ! grep -q "^module(load=\"imudp\")" /etc/rsyslog.conf 2>/dev/null; then
    echo "Enabling UDP syslog input on port 514..."
    sudo tee /etc/rsyslog.d/10-udp-input.conf > /dev/null <<'RSYSLOG_UDP'
# Enable UDP syslog input for Docker container logs
module(load="imudp")
input(type="imudp" port="514")
RSYSLOG_UDP
    echo -e "${GREEN}✓ UDP syslog input enabled${NC}"
else
    echo -e "${GREEN}✓ UDP syslog input already configured${NC}"
fi

# Configure log forwarding for pickleball services
sudo tee /etc/rsyslog.d/50-pickleball.conf > /dev/null <<'RSYSLOG_PICKLEBALL'
# Pickleball Kiosk log handling
# Filter and forward logs from pickleball services

# Create a template for JSON logs (preserves structured logging)
template(name="PickleballLogFormat" type="string"
    string="%msg%\n")

# Write pickleball logs to a dedicated file
if $programname startswith 'pickleball-' then {
    action(type="omfile" file="/var/log/pickleball-kiosk.log" template="PickleballLogFormat")
}
RSYSLOG_PICKLEBALL

echo -e "${GREEN}✓ Pickleball log handling configured${NC}"

# Ask about Azure Log Analytics integration
echo ""
echo -e "${BLUE}Azure Log Analytics Integration (Optional)${NC}"
echo "Do you want to configure log forwarding to Azure Log Analytics?"
echo "You'll need your Workspace ID and Primary Key from the Azure portal."
echo ""
read -p "Configure Azure Log Analytics? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    read -p "Enter your Log Analytics Workspace ID: " LA_WORKSPACE_ID
    read -p "Enter your Log Analytics Primary Key: " LA_PRIMARY_KEY

    if [ -n "$LA_WORKSPACE_ID" ] && [ -n "$LA_PRIMARY_KEY" ]; then
        # Install required packages for Azure forwarding
        sudo apt-get install -y curl openssl

        # Create the Azure Log Analytics forwarding script
        sudo tee /usr/local/bin/send-to-azure-logs.sh > /dev/null <<'AZURE_SCRIPT'
#!/bin/bash
# Azure Log Analytics HTTP Data Collector API forwarder
# Reads from stdin and sends to Azure Log Analytics

WORKSPACE_ID="__WORKSPACE_ID__"
SHARED_KEY="__SHARED_KEY__"
LOG_TYPE="PickleballKiosk"

# Read log line from stdin
read -r LOG_LINE

# Skip empty lines
[ -z "$LOG_LINE" ] && exit 0

# Prepare the JSON body
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
JSON_BODY="[{\"timestamp\":\"$TIMESTAMP\",\"message\":$LOG_LINE}]"

# Calculate content length
CONTENT_LENGTH=${#JSON_BODY}

# Build the signature
RFC1123DATE=$(date -u +"%a, %d %b %Y %H:%M:%S GMT")
STRING_TO_SIGN="POST\n$CONTENT_LENGTH\napplication/json\nx-ms-date:$RFC1123DATE\n/api/logs"
DECODED_KEY=$(echo -n "$SHARED_KEY" | base64 -d)
SIGNATURE=$(echo -ne "$STRING_TO_SIGN" | openssl dgst -sha256 -hmac "$DECODED_KEY" -binary | base64)
AUTH="SharedKey $WORKSPACE_ID:$SIGNATURE"

# Send to Azure
curl -s -X POST \
    "https://${WORKSPACE_ID}.ods.opinsights.azure.com/api/logs?api-version=2016-04-01" \
    -H "Content-Type: application/json" \
    -H "Log-Type: $LOG_TYPE" \
    -H "x-ms-date: $RFC1123DATE" \
    -H "Authorization: $AUTH" \
    -d "$JSON_BODY" > /dev/null 2>&1
AZURE_SCRIPT

        # Replace placeholders with actual values
        sudo sed -i "s/__WORKSPACE_ID__/$LA_WORKSPACE_ID/" /usr/local/bin/send-to-azure-logs.sh
        sudo sed -i "s|__SHARED_KEY__|$LA_PRIMARY_KEY|" /usr/local/bin/send-to-azure-logs.sh
        sudo chmod +x /usr/local/bin/send-to-azure-logs.sh

        # Add rsyslog rule to forward to Azure
        sudo tee /etc/rsyslog.d/60-azure-forward.conf > /dev/null <<'RSYSLOG_AZURE'
# Forward pickleball logs to Azure Log Analytics
# Uses the HTTP Data Collector API via shell script

template(name="AzureFormat" type="string" string="%msg%")

if $programname startswith 'pickleball-' then {
    action(type="omprog"
           binary="/usr/local/bin/send-to-azure-logs.sh"
           template="AzureFormat")
}
RSYSLOG_AZURE

        echo -e "${GREEN}✓ Azure Log Analytics forwarding configured${NC}"
    else
        echo -e "${YELLOW}Skipping Azure configuration (missing credentials)${NC}"
    fi
else
    echo -e "${YELLOW}Skipping Azure Log Analytics configuration${NC}"
fi

# Restart rsyslog to apply changes
sudo systemctl restart rsyslog
echo -e "${GREEN}✓ rsyslog restarted${NC}"
echo ""

# Build and start application
echo "[STEP 6/8] Building and starting application..."
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
echo "[STEP 7/8] Configuring auto-start..."

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
echo "[STEP 8/8] Configuring kiosk mode..."

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
echo "  ✓ Required packages installed (unclutter, firefox-esr)"
echo "  ✓ Docker and Docker Compose installed"
echo "  ✓ rsyslog configured for log collection"
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
echo "Log files:"
echo "  Local:   /var/log/pickleball-kiosk.log"
echo "  View:    sudo tail -f /var/log/pickleball-kiosk.log"
echo ""
