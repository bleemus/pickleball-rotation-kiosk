#!/bin/bash

# Raspberry Pi Setup Script for Pickleball Kiosk
# Run this on a fresh Raspberry Pi OS installation

set -e

echo "🏓 Pickleball Kiosk - Raspberry Pi Setup"
echo "========================================"

# Update system
echo "📦 Updating system packages..."
sudo apt-get update
sudo apt-get upgrade -y

# Install Docker
echo "🐳 Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
    echo "✅ Docker installed"
else
    echo "✅ Docker already installed"
fi

# Install Docker Compose
echo "🐙 Installing Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    sudo apt-get install -y docker-compose
    echo "✅ Docker Compose installed"
else
    echo "✅ Docker Compose already installed"
fi

# Enable Docker service
echo "🔧 Enabling Docker service..."
sudo systemctl enable docker
sudo systemctl start docker

# Configure GPU memory split (for better performance on kiosk display)
echo "🖥️  Optimizing GPU memory..."
if ! grep -q "gpu_mem=256" /boot/config.txt; then
    echo "gpu_mem=256" | sudo tee -a /boot/config.txt
    echo "✅ GPU memory configured"
fi

# Disable screen blanking (for kiosk mode)
echo "🖼️  Disabling screen blanking..."
sudo apt-get install -y xscreensaver
mkdir -p ~/.config/lxsession/LXDE-pi
cat > ~/.config/lxsession/LXDE-pi/autostart <<EOF
@lxpanel --profile LXDE-pi
@pcmanfm --desktop --profile LXDE-pi
@xscreensaver -no-splash
@xset s off
@xset -dpms
@xset s noblank
@chromium-browser --kiosk --disable-infobars --disable-session-crashed-bubble http://localhost
EOF

echo "✅ Screen blanking disabled"

# Install unclutter to hide mouse cursor
echo "🖱️  Installing cursor hiding utility..."
sudo apt-get install -y unclutter
echo "@unclutter -idle 0.1 -root" >> ~/.config/lxsession/LXDE-pi/autostart

# Create systemd service for auto-start
echo "⚙️  Creating systemd service..."
sudo tee /etc/systemd/system/pickleball-kiosk.service > /dev/null <<EOF
[Unit]
Description=Pickleball Kiosk
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$HOME/pickleball-kiosk
ExecStart=/usr/bin/docker-compose up -d
ExecStop=/usr/bin/docker-compose down
TimeoutStartSec=0
User=$USER

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable pickleball-kiosk.service
echo "✅ Systemd service created and enabled"

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Reboot your Pi: sudo reboot"
echo "2. After reboot, the kiosk will start automatically"
echo "3. To manage the service:"
echo "   sudo systemctl status pickleball-kiosk  # Check status"
echo "   sudo systemctl restart pickleball-kiosk # Restart"
echo "   sudo systemctl stop pickleball-kiosk    # Stop"
echo ""
echo "4. View logs: docker-compose logs -f"
echo "5. Access the app at http://localhost"
echo ""
read -p "Reboot now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    sudo reboot
fi
