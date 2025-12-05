#!/bin/bash
PUBLIC_PORT=$1
VPN_IP=$2
PRIVATE_PORT=$3

# Hapus DNAT dari FORWARD_BT
sudo iptables -t nat -D FORWARD_BT -p tcp --dport $PUBLIC_PORT -j DNAT --to-destination $VPN_IP:$PRIVATE_PORT

echo "[DEBUG] Removed VPN forward $PUBLIC_PORT -> $VPN_IP:$PRIVATE_PORT" >> /tmp/vpn_forward.log
