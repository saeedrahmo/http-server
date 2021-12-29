# HTTP remote file manager over UDP
The primary objective of this project is to use the unreliable UDP instead of TCP transport protocol in the implementation of both HTTP Client and HTTP file manager. To this end, it manually ensures the reliability of the transport on top of UDP protocol by implementing Selective-Repeat ARQ technique.

# Test
run /router/source/./rounter --help \n
run udp/node httpfs --help \n
run udp/node httpc --help

# ScreenShots
![ScreenShot](https://github.com/saeedrahmo/http-server/blob/main/screenshots/udp-run-get.png?raw=true "Testing http get over udp")
