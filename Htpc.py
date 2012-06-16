#!/usr/bin/python
import os, sys, argparse

# Insert local directories into path
sys.path.insert(0, os.path.join(os.getcwd(), 'libs'))

# Import serve
from htpc.serve import serve

# Default configuration file
config = os.path.join(os.getcwd(), '/userdata/config.cfg')

# Get variables from commandline
parser = argparse.ArgumentParser()
parser.add_argument('-c', '--config', default=config)
parser.add_argument('-d', '--daemon', action='store_true', default=0)
args = parser.parse_args()

if not os.path.isfile(args.config):
    sys.exit("Configuration file: "+args.config+" doesn't exist. Copy userdata/config-sample.cfg to userdata/config.cfg")

if args.daemon and sys.platform == 'win32':
    print "Daemon mode not possible on Windows. Starting normally"
    args.daemon = 0

serve(args.config, args.daemon).start()
