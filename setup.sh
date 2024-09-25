#!/bin/bash

{
  curl -sL https://deb.nodesource.com/setup_22.x -o nodesource_setup.sh
  sudo bash nodesource_setup.sh
  sudo apt install -y nodejs
  node -v # deve ser 22
  corepack enable pnpm
  git clone https://github.com/celestial-hub/horizon && cd horizon
  pnpm install && pnpm build && pnpm start
} >horizon.log 2>&1 &

nohup tail -f horizon.log &
