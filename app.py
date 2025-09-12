"""
THE BEER-WARE LICENSE (Revision 42)

<mende.r@hotmail.de> wrote this file. As long as you retain this notice you can do whatever you want with this
stuff. If we meet someday, and you think this stuff is worth it, you can
buy me a beer in return.
Ralf Mende
"""

"""
Thin wrapper to run the app from the new src/ package layout without changing your CLI.
Keep using: python app.py --udp-ip 127.0.0.1 --config tmp --host 127.0.0.1 --port 8000
"""

import os
import sys

# Ensure the in-repo 'src' is importable so 'mobile_station_webapp' can be found
_HERE = os.path.dirname(__file__)
_SRC = os.path.join(_HERE, 'src')
if _SRC not in sys.path:
    sys.path.insert(0, _SRC)

from mobile_station_webapp import app, run_server, parse_args  # type: ignore

if __name__ == '__main__':
    args = parse_args()
    run_server(udp_ip=args.udp_ip, config_path=args.config_path, host=args.host, port=args.port)