#!/bin/bash
# Quick script to create the autostart file for Firefox kiosk mode

set -e

# Get current hostname
HOSTNAME=$(hostname)
MDNS_NAME="${HOSTNAME}.local"

echo "Creating autostart file for kiosk mode..."
echo "Using URL: http://$MDNS_NAME/spectator"
echo ""

# Create directory
mkdir -p ~/.config/lxsession/LXDE-pi

# Backup existing file if it exists
if [ -f ~/.config/lxsession/LXDE-pi/autostart ]; then
    cp ~/.config/lxsession/LXDE-pi/autostart ~/.config/lxsession/LXDE-pi/autostart.backup.$(date +%s)
    echo "Backed up existing autostart file"
fi

# Create autostart file
cat > ~/.config/lxsession/LXDE-pi/autostart <<EOF
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
@firefox-esr --kiosk http://$MDNS_NAME/spectator
EOF

echo "✓ Autostart file created at ~/.config/lxsession/LXDE-pi/autostart"
echo ""
echo "Contents:"
cat ~/.config/lxsession/LXDE-pi/autostart
echo ""
echo "Reboot to activate kiosk mode:"
echo "  sudo reboot"
