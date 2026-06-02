# sandbox/Dockerfile
# The image each terminal session runs inside. Debian slim + a working toolset.
# Runs as a non-root user. Build once:
#   docker build -t qup-terminal-sandbox:latest ./sandbox

FROM debian:bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive

# Core tooling + python + node + build tools (the "fuller" image).
RUN apt-get update && apt-get install -y --no-install-recommends \
      bash coreutils ca-certificates \
      curl wget git vim nano less \
      python3 python3-pip python3-venv \
      build-essential \
      iproute2 procps \
    && rm -rf /var/lib/apt/lists/*

# Node.js LTS via NodeSource.
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

# Non-root user with a real home. Sessions run as this user, never root.
RUN useradd --create-home --shell /bin/bash sandbox

# A friendly prompt + landing message.
# Bash config goes in /etc/profile.d (on the read-only root, NOT the home dir),
# because the session mounts an empty tmpfs over /home/sandbox which would hide
# anything we put in ~/.bashrc at build time. profile.d is sourced by login
# shells and survives the ephemeral home.
RUN printf '%s\n' \
      'export PS1="\[\e[38;5;173m\]qup\[\e[0m\]:\w\$ "' \
      'export HISTFILE=$HOME/.bash_history' \
      'export PROMPT_COMMAND="history -a"' \
      'shopt -s histappend 2>/dev/null || true' \
      'touch "$HISTFILE" 2>/dev/null || true' \
      'if [ -z "$QUP_WELCOMED" ]; then export QUP_WELCOMED=1; echo "Qup Terminal sandbox — isolated, disposable session."; echo "Your home is writable; the rest of the system is not."; fi' \
      > /etc/profile.d/qup.sh \
    && chmod 644 /etc/profile.d/qup.sh

USER sandbox
WORKDIR /home/sandbox

CMD ["/bin/bash"]
