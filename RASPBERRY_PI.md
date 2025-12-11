# Raspberry Pi Deployment Guide

Complete guide for deploying the Pickleball Kiosk on a Raspberry Pi using Docker Compose.

## Hardware Requirements

### Minimum (Will Work)
- **Raspberry Pi 3B+** or newer
- **2GB RAM** minimum
- **16GB microSD card** (Class 10 or better)
- **Power supply**: Official Pi power adapter recommended
- **Display**: Any HDMI monitor/TV
- **Optional**: Touchscreen for better kiosk experience

### Recommended (Better Performance)
- **Raspberry Pi 4 (4GB RAM)** or **Raspberry Pi 5**
- **32GB microSD card** (for better longevity)
- **Ethernet connection** (more reliable than WiFi)
- **Official 7" touchscreen** or USB touchscreen

## Quick Start

### 1. Prepare the Raspberry Pi

```bash
# Copy project to your Pi
scp -r pickleball-kiosk pi@raspberrypi.local:~/

# SSH into your Pi
ssh pi@raspberrypi.local

# Navigate to project
cd pickleball-kiosk

# Run setup script
./raspberry-pi-setup.sh
```

The setup script will:
- Install Docker and Docker Compose
- Configure kiosk mode (full screen, no sleep)
- Set up auto-start on boot
- Optimize GPU memory
- Hide mouse cursor

### 2. Reboot

```bash
sudo reboot
```

### 3. Done!

After reboot, the kiosk will automatically:
- Start Docker Compose services
- Launch Chromium in full-screen kiosk mode
- Display the app at http://localhost

## Manual Setup

If you prefer to set things up manually:

### Install Docker

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

### Install Docker Compose

```bash
sudo apt-get update
sudo apt-get install -y docker-compose
```

### Deploy Application

```bash
cd pickleball-kiosk
docker-compose up -d
```

## Kiosk Mode Setup

### Auto-launch Browser in Kiosk Mode

Edit the autostart file:

```bash
mkdir -p ~/.config/lxsession/LXDE-pi
nano ~/.config/lxsession/LXDE-pi/autostart
```

Add these lines:

```bash
@lxpanel --profile LXDE-pi
@pcmanfm --desktop --profile LXDE-pi
@xset s off
@xset -dpms
@xset s noblank
@chromium-browser --kiosk --disable-infobars --disable-session-crashed-bubble http://localhost
```

### Hide Mouse Cursor

```bash
sudo apt-get install -y unclutter
echo "@unclutter -idle 0.1 -root" >> ~/.config/lxsession/LXDE-pi/autostart
```

### Auto-login (Skip login screen)

```bash
sudo raspi-config
# Select: System Options > Boot / Auto Login > Desktop Autologin
```

## Auto-start on Boot

The setup script creates a systemd service that automatically starts the kiosk on boot.

### Manual systemd Service Setup

Create service file:

```bash
sudo nano /etc/systemd/system/pickleball-kiosk.service
```

Add this content:

```ini
[Unit]
Description=Pickleball Kiosk
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/home/pi/pickleball-kiosk
ExecStart=/usr/bin/docker-compose up -d
ExecStop=/usr/bin/docker-compose down
TimeoutStartSec=0
User=pi

[Install]
WantedBy=multi-user.target
```

Enable the service:

```bash
sudo systemctl enable pickleball-kiosk.service
sudo systemctl start pickleball-kiosk.service
```

### Service Management

```bash
# Check status
sudo systemctl status pickleball-kiosk

# Restart
sudo systemctl restart pickleball-kiosk

# Stop
sudo systemctl stop pickleball-kiosk

# View logs
sudo journalctl -u pickleball-kiosk -f
```

## Managing the Application

### Docker Compose Commands

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# Restart services
docker-compose restart

# Rebuild and restart
docker-compose up -d --build

# Check status
docker-compose ps
```

### Using Make Commands

```bash
# Start
make up

# Stop
make down

# View logs
make logs

# Restart
make restart

# Clean everything
make clean
```

## Performance Optimization

### 1. Increase GPU Memory

Edit `/boot/config.txt`:

```bash
sudo nano /boot/config.txt
```

Add or modify:

```
gpu_mem=256
```

### 2. Overclock (Raspberry Pi 4)

Add to `/boot/config.txt` (ensure good cooling):

```
over_voltage=6
arm_freq=2000
```

**Warning**: Overclocking may void warranty and requires proper cooling.

### 3. Disable Unnecessary Services

```bash
# Disable Bluetooth (if not needed)
sudo systemctl disable bluetooth

# Disable WiFi (if using Ethernet)
sudo rfkill block wifi
```

### 4. Use Ethernet Instead of WiFi

For more reliable connectivity and better performance, use a wired Ethernet connection.

### 5. Optimize Docker

Edit `/etc/docker/daemon.json`:

```bash
sudo nano /etc/docker/daemon.json
```

Add:

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

Restart Docker:

```bash
sudo systemctl restart docker
```

## Monitoring and Maintenance

### Check Resource Usage

```bash
# Overall system resources
htop

# Docker containers
docker stats

# Disk space
df -h

# Temperature (keep below 80°C)
vcgencmd measure_temp

# Memory usage
free -h
```

### View Application Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f redis
```

### Backup Session Data

```bash
# Backup Redis data
docker-compose exec redis redis-cli SAVE
docker cp pickleball-redis:/data/dump.rdb ./backup/

# Restore
docker cp ./backup/dump.rdb pickleball-redis:/data/
docker-compose restart redis
```

### Update Application

```bash
# Pull latest changes
git pull

# Rebuild and restart
docker-compose down
docker-compose build
docker-compose up -d
```

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker-compose logs backend

# Check if ports are in use
sudo netstat -tulpn | grep :3001

# Rebuild from scratch
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

### Out of Memory

```bash
# Check memory usage
free -h

# Add swap space
sudo dphys-swapfile swapoff
sudo nano /etc/dphys-swapfile
# Set CONF_SWAPSIZE=2048
sudo dphys-swapfile setup
sudo dphys-swapfile swapon
```

### Screen Not Turning On

Add to `/boot/config.txt`:

```
hdmi_force_hotplug=1
hdmi_drive=2
```

### Browser Not Auto-launching

```bash
# Check autostart file
cat ~/.config/lxsession/LXDE-pi/autostart

# Test browser manually
chromium-browser --kiosk http://localhost
```

### Network Issues

```bash
# Test backend connectivity
curl http://localhost:3001/health

# Test Redis
docker-compose exec redis redis-cli ping

# Restart networking
sudo systemctl restart networking
```

### Docker Build Takes Too Long

The first build on Raspberry Pi can take 10-15 minutes. Subsequent builds are faster due to caching.

```bash
# Check build progress
docker-compose build --progress=plain

# Use pre-built images (if available)
# Tag and push from your dev machine, then pull on Pi
```

### Display Issues

```bash
# Rotate display (if needed)
# Add to /boot/config.txt:
display_rotate=1  # 90 degrees
display_rotate=2  # 180 degrees
display_rotate=3  # 270 degrees

# Force resolution
hdmi_group=2
hdmi_mode=82  # 1920x1080 60Hz
```

## Security Considerations

### Change Default Password

```bash
passwd
```

### Enable Firewall

```bash
sudo apt-get install -y ufw
sudo ufw allow 22   # SSH
sudo ufw allow 80   # Frontend
sudo ufw allow 3001 # Backend API
sudo ufw enable
```

### Disable SSH (if not needed)

```bash
sudo systemctl disable ssh
sudo systemctl stop ssh
```

### Regular Updates

```bash
# Update system
sudo apt-get update
sudo apt-get upgrade -y

# Update Docker images
docker-compose pull
docker-compose up -d
```

## Advanced Configuration

### Custom Domain

If you want to access via custom domain:

1. Edit `/etc/hosts`:
```bash
sudo nano /etc/hosts
```

2. Add:
```
127.0.0.1 pickleball.local
```

3. Update browser URL in autostart:
```bash
nano ~/.config/lxsession/LXDE-pi/autostart
# Change http://localhost to http://pickleball.local
```

### Remote Access

To access from other devices on your network:

1. Find Pi's IP:
```bash
hostname -I
```

2. Access from another device:
```
http://192.168.1.100  # Use your Pi's actual IP
```

3. For external access (use with caution):
```bash
# Port forwarding on your router
# Map external port 80 to Pi's IP:80
```

### Multiple Displays

For dual-display setup:

```bash
# Configure displays
sudo raspi-config
# Display Options > Resolution

# Or edit /boot/config.txt for custom setup
```

## Cost Estimate

- **Raspberry Pi 4 (4GB)**: $55
- **Official 7" Touchscreen**: $75
- **Case + Power Supply**: $25
- **32GB microSD Card**: $10
- **Total**: ~$165

Compare to dedicated kiosk hardware: $500-1000+

## Recommended Configuration

For the best kiosk experience on Raspberry Pi 4:

- **4GB RAM model**
- **256MB GPU memory**
- **Ethernet connection**
- **Good cooling (heatsink + fan)**
- **Quality power supply (official recommended)**
- **Auto-start enabled**
- **Screen blanking disabled**
- **Mouse cursor hidden**

## Performance Expectations

### Raspberry Pi 3B+
- Basic functionality: ✅ Works
- Smooth UI: ⚠️ Acceptable
- Build time: ~15 minutes
- Good for: Testing, low-traffic use

### Raspberry Pi 4 (4GB)
- Basic functionality: ✅ Excellent
- Smooth UI: ✅ Very smooth
- Build time: ~8 minutes
- Good for: Production kiosk use

### Raspberry Pi 5
- Basic functionality: ✅ Excellent
- Smooth UI: ✅ Silky smooth
- Build time: ~5 minutes
- Good for: Production, future-proof

## Tips and Tricks

### Prevent SD Card Corruption

```bash
# Use read-only filesystem (advanced)
# Or use quality SD card and UPS

# Enable overlayfs
sudo raspi-config
# Performance Options > Overlay File System
```

### Auto-refresh Page Daily

Add to autostart before browser launch:

```bash
@sh -c 'sleep 30 && while true; do sleep 86400; xdotool key F5; done' &
```

### Monitor Temperature

Create monitoring script:

```bash
#!/bin/bash
# Save as ~/temp_monitor.sh

while true; do
  temp=$(vcgencmd measure_temp | cut -d= -f2)
  echo "$(date): $temp"
  if [[ ${temp%°C} > 80 ]]; then
    echo "Warning: High temperature!"
  fi
  sleep 60
done
```

### Graceful Shutdown Button

Connect GPIO button for safe shutdown:

```python
# Save as ~/shutdown_button.py
import RPi.GPIO as GPIO
import time
import os

GPIO.setmode(GPIO.BCM)
GPIO.setup(3, GPIO.IN, pull_up_down=GPIO.PUD_UP)

while True:
    if GPIO.input(3) == False:
        os.system("sudo shutdown -h now")
    time.sleep(1)
```

## Summary

Docker Compose on Raspberry Pi provides:
- ✅ Simple, reliable deployment
- ✅ Auto-start on boot
- ✅ Easy updates and maintenance
- ✅ Perfect for single-kiosk use
- ✅ Low cost (~$165 total)
- ✅ Great performance on Pi 4+

Your kiosk will run 24/7, auto-recover from crashes, and provide a smooth touch-friendly experience for managing pickleball games!
