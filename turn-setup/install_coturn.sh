#!/bin/bash

# Install Coturn
echo "Installing Coturn..."
sudo apt-get update
sudo apt-get install -y coturn

# Backup original config
sudo mv /etc/turnserver.conf /etc/turnserver.conf.bak

# Copy our config
echo "Configuring Coturn..."
sudo cp turnserver.conf /etc/turnserver.conf

# Detect Public IP (AWS/GCP/Azure friendly)
PUBLIC_IP=$(curl -s ifconfig.me)
echo "Detected Public IP: $PUBLIC_IP"

# Update config with Public IP
sudo sed -i "s/# external-ip=YOUR_SERVER_PUBLIC_IP/external-ip=$PUBLIC_IP/" /etc/turnserver.conf

# Enable Coturn service
sudo sed -i 's/#TURNSERVER_ENABLED=1/TURNSERVER_ENABLED=1/' /etc/default/coturn

# Restart Service
echo "Restarting Coturn..."
sudo systemctl restart coturn

echo "✅ Coturn is running!"
echo "TURN URL: turn:$PUBLIC_IP:3478"
echo "Username: calmoraa"
echo "Password: secure_video_password"
