# Raspberry Pi Kiosk Setup Guide

Complete guide for deploying the Pickleball Kiosk on a Raspberry Pi with automatic spectator display.

## Hardware Requirements

### Minimum

- **Raspberry Pi 3B+** or newer
- **2GB RAM** minimum
- **16GB microSD card** (Class 10 or better)
- **Power supply**: Official Pi power adapter recommended
- **Display**: Any HDMI monitor/TV
- **Network**: WiFi or Ethernet connection

### Recommended

- **Raspberry Pi 4 (4GB RAM)** or **Raspberry Pi 5**
- **32GB microSD card** (for better longevity)
- **Ethernet connection** (more reliable than WiFi)

---

## Quick Setup

### 1. Install Raspberry Pi OS

**Using Raspberry Pi Imager:**

1. Download [Raspberry Pi Imager](https://www.raspberrypi.com/software/)
2. Insert SD card into your computer
3. Open Raspberry Pi Imager
4. **Choose OS**: Raspberry Pi OS (64-bit)
5. **Choose Storage**: Select your SD card
6. **Click Settings (⚙️)** to configure:
   - ✅ Set hostname (e.g., `pickleball`)
   - ✅ Enable SSH
   - ✅ Set username and password (user: `pi`, password: your choice)
   - ✅ Configure wireless LAN (if using WiFi)
   - ✅ Set locale settings
7. **Click Write** and wait for completion

### 2. First Boot

1. Insert SD card into Raspberry Pi
2. Connect:
   - HDMI cable to monitor/TV
   - Ethernet cable (or ensure WiFi is configured)
   - Power supply
3. Boot and complete the setup wizard (if it appears)
4. Wait for desktop to load

### 3. Install the Kiosk

**Option A: From the Pi (via terminal or SSH)**

```bash
# Clone the repository
git clone https://github.com/bleemus/pickleball-rotation-kiosk.git
cd pickleball-rotation-kiosk

# Run the installer
./scripts/install.sh

# Follow the prompts
```

**Option B: From another computer (via SSH)**

```bash
# SSH into the Pi
ssh pi@pickleball.local

# Clone and install
git clone https://github.com/bleemus/pickleball-rotation-kiosk.git
cd pickleball-rotation-kiosk
./scripts/install.sh
```

### 4. Reboot

```bash
sudo reboot
```

### 5. Done!

After reboot:

- **Spectator display** launches automatically in fullscreen on the Pi's HDMI display
- **Admin interface** accessible from any device on the network at `http://pickleball.local/`

---

## What the Installer Does

The `install.sh` script automatically:

1. ✅ Updates system packages
2. ✅ Installs unclutter (for cursor hiding in kiosk mode)
3. ✅ Installs Docker
4. ✅ Installs Docker Compose
5. ✅ Builds and starts the application
6. ✅ Configures kiosk mode (spectator display auto-launches)
7. ✅ Sets up auto-start on boot

**Installation time:** 10-15 minutes (requires internet connection)

---

## Access URLs

After installation:

| Interface        | URL                                   | Description                               |
| ---------------- | ------------------------------------- | ----------------------------------------- |
| **Admin**        | `http://pickleball.local/`            | Manage games, enter scores, add players   |
| **Spectator**    | `http://pickleball.local/spectator`   | Full-screen display (auto-launches on Pi) |
| **Backend API**  | `http://pickleball.local:3001/api`    | REST API endpoints                        |
| **Email Parser** | `http://pickleball.local:3002/health` | Email parsing service health              |
| **Health Check** | `http://pickleball.local:3001/health` | Backend health status                     |

Replace `pickleball` with your chosen hostname.

---

## Management Commands

```bash
# Navigate to application directory
cd ~/pickleball-rotation-kiosk

# Stop application
make down

# Start application
make up

# Restart application
make restart

# View logs (all services)
make logs

# Build images
make build

# Clean up (removes containers and volumes)
make clean
```

---

## Troubleshooting

### Can't Access pickleball.local

**Problem:** Browser shows "can't reach this site"

**Solutions:**

1. **Check mDNS is running:**

   ```bash
   sudo systemctl status avahi-daemon
   ```

2. **Find IP address:**

   ```bash
   hostname -I
   ```

   Then access via IP: `http://192.168.1.XXX/`

3. **Windows users:** Install [Bonjour Print Services](https://support.apple.com/kb/DL999)

4. **Ensure same network:** Pi and device must be on the same WiFi/network

### WiFi Not Working

**Problem:** Pi doesn't connect to WiFi

**Solutions:**

1. **Check if WiFi is blocked:**

   ```bash
   sudo rfkill list
   ```

2. **Unblock WiFi:**

   ```bash
   sudo rfkill unblock wifi
   sudo rfkill unblock all
   ```

3. **Check WiFi configuration:**

   ```bash
   cat /etc/wpa_supplicant/wpa_supplicant.conf
   ```

4. **Use Ethernet:** Connect via Ethernet cable for reliable connection

### Spectator Display Not Launching

**Problem:** Desktop shows but spectator display doesn't launch

**Solutions:**

1. **Check if application is running:**

   ```bash
   cd ~/pickleball-rotation-kiosk
   docker ps
   ```

   All containers should be running

2. **Check autostart configuration:**

   ```bash
   cat ~/.config/lxsession/LXDE-pi/autostart
   ```

   Should include firefox-esr line

3. **Re-run installer:**

   ```bash
   cd ~/pickleball-rotation-kiosk
   ./scripts/install.sh
   ```

4. **Reboot:**
   ```bash
   sudo reboot
   ```

### Display Goes Black / Screen Blanking

**Problem:** Screen turns black after a few minutes

**Solutions:**

1. **Check screen blanking settings:**

   ```bash
   grep "xserver-command" /etc/lightdm/lightdm.conf
   ```

   Should show: `xserver-command=X -s 0 -dpms`

2. **Re-run installer to fix:**
   ```bash
   cd ~/pickleball-rotation-kiosk
   ./scripts/install.sh
   sudo reboot
   ```

### Docker Services Won't Start

**Problem:** `docker-compose up` fails or services are unhealthy

**Solutions:**

1. **Check Docker is running:**

   ```bash
   sudo systemctl status docker
   sudo systemctl start docker
   ```

2. **Check disk space:**

   ```bash
   df -h
   ```

   Root partition should have at least 2GB free

3. **Clean and rebuild:**

   ```bash
   cd ~/pickleball-rotation-kiosk
   make clean
   make build
   make up
   ```

4. **View logs for errors:**
   ```bash
   make logs
   ```

### Installation Failed

**Problem:** Installer encountered errors

**Solutions:**

1. **Check internet connection:**

   ```bash
   ping -c 3 google.com
   ```

2. **Check available disk space:**

   ```bash
   df -h
   ```

3. **View system logs:**

   ```bash
   sudo journalctl -xe
   ```

4. **Try manual installation steps:**

   ```bash
   # Update system
   sudo apt-get update
   sudo apt-get upgrade -y

   # Install Docker manually
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   sudo usermod -aG docker $USER

   # Install Docker Compose manually
   sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   sudo chmod +x /usr/local/bin/docker-compose

   # Re-run installer
   cd ~/pickleball-rotation-kiosk
   ./scripts/install.sh
   ```

---

## Advanced Configuration

### Multiple Kiosks on Same Network

For multiple courts/kiosks:

1. **Use unique hostnames for each:**
   - Court 1: `court1.local`
   - Court 2: `court2.local`
   - Court 3: `court3.local`

2. **During installation, set different hostname:**

   ```
   Change hostname? y
   Enter new hostname: court1
   ```

3. **Each Pi runs independently:**
   - Court 1: `http://court1.local/`
   - Court 2: `http://court2.local/`
   - Court 3: `http://court3.local/`

### Using Static IP

If you prefer static IP over hostname:

```bash
# Edit network configuration
sudo nano /etc/dhcpcd.conf

# Add at the end (adjust IP to your network):
interface eth0
static ip_address=192.168.1.100/24
static routers=192.168.1.1
static domain_name_servers=192.168.1.1 8.8.8.8

# Reboot to apply
sudo reboot
```

Access at: `http://192.168.1.100/`

### Disable Auto-Login

If you want password protection:

```bash
sudo raspi-config
# Select: System Options > Boot / Auto Login > Console
```

### Customizing Kiosk Behavior

Edit autostart configuration:

```bash
nano ~/.config/lxsession/LXDE-pi/autostart
```

**Change spectator URL to admin interface:**

```bash
@firefox-esr --kiosk http://pickleball.local/
```

**Change wait time before launch:**

```bash
@bash -c "sleep 20"  # Wait 20 seconds instead of 15
```

**Disable cursor hiding:**

```bash
# Remove or comment out:
# @unclutter -idle 0.5 -root
```

---

## Maintenance

### Update Application

```bash
cd ~/pickleball-rotation-kiosk

# Pull latest code
git pull

# Rebuild and restart
docker-compose down
docker-compose build
docker-compose up -d
```

### Update System

```bash
sudo apt-get update
sudo apt-get upgrade -y
sudo reboot
```

### Backup Configuration

```bash
# Backup autostart config
cp ~/.config/lxsession/LXDE-pi/autostart ~/autostart.backup

# Backup application data (if needed)
docker-compose exec redis redis-cli SAVE
```

### Reset to Defaults

```bash
cd ~/pickleball-rotation-kiosk

# Remove application
docker-compose down -v

# Re-run installer
./scripts/install.sh

# Reboot
sudo reboot
```

---

## Performance Tips

1. **Use Ethernet** instead of WiFi for more reliable connection
2. **32GB SD card** recommended for better performance and longevity
3. **Raspberry Pi 4 (4GB)** or **Pi 5** recommended for best performance
4. **Quality power supply** prevents random reboots
5. **Cooling** - Use heatsinks or fan for Pi 4/5 under load

---

## Support

- **Documentation:** See [README.md](README.md) and [QUICKSTART.md](QUICKSTART.md)
- **Issues:** [GitHub Issues](https://github.com/bleemus/pickleball-rotation-kiosk/issues)
- **Raspberry Pi Docs:** [raspberrypi.com/documentation](https://www.raspberrypi.com/documentation/)
