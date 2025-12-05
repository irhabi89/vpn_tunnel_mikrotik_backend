#!/bin/bash

# Parameter dari backend
PUBLIC_PORT=$1   # port dari port_pool / database
VPN_IP=$2        # ip VPN client (10.30.0.X)
PRIVATE_PORT=$3  # port tujuan di VPN client (misal Winbox 8291)

# Tambahkan NAT / port forwarding
iptables -t nat -A PREROUTING -p tcp --dport $PUBLIC_PORT -j DNAT --to-destination $VPN_IP:$PRIVATE_PORT
iptables -A FORWARD -p tcp -d $VPN_IP --dport $PRIVATE_PORT -j ACCEPT
