# Use official Ubuntu as base image
# Image will be cached, only rebuilt when Dockerfile changes
FROM mcr.microsoft.com/devcontainers/base:ubuntu-22.04

# Set environment variables
ENV DEBIAN_FRONTEND=noninteractive
ENV NODE_VERSION=20
ENV PYTHON_VERSION=3.13

# Use BuildKit cache to speed up builds
# These layers will be cached and won't be re-executed every time

# Install system dependencies
RUN apt-get update && apt-get install -y \
  # Basic tools
  curl \
  wget \
  git \
  build-essential \
  software-properties-common \
  # Python dependencies
  python3-dev \
  python3-pip \
  python3-venv \
  # PostgreSQL client
  postgresql-client \
  # Other tools
  vim \
  nano \
  htop \
  && rm -rf /var/lib/apt/lists/*

# Install Python 3.13 (use deadsnakes PPA if not available in apt)
RUN add-apt-repository ppa:deadsnakes/ppa -y && \
  apt-get update && \
  apt-get install -y python3.13 python3.13-venv python3.13-dev && \
  update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.13 1 && \
  rm -rf /var/lib/apt/lists/*

# Install pip for Python 3.13
RUN curl -sS https://bootstrap.pypa.io/get-pip.py | python3.13

# Install Node.js 20.x
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
  apt-get install -y nodejs && \
  rm -rf /var/lib/apt/lists/*

# Update npm to latest version
RUN npm install -g npm@latest

# Install global Node.js tools
RUN npm install -g \
  turbo \
  yarn \
  pnpm

# Set default location for Python virtual environment
ENV PIPENV_VENV_IN_PROJECT=1
ENV VIRTUAL_ENV=/workspace/backend/.venv

# Create non-root user (if doesn't exist)
ARG USERNAME=vscode
ARG USER_UID=1000
ARG USER_GID=$USER_UID

RUN if ! id -u $USERNAME > /dev/null 2>&1; then \
  groupadd --gid $USER_GID $USERNAME && \
  useradd --uid $USER_UID --gid $USER_GID -m $USERNAME && \
  echo $USERNAME ALL=\(root\) NOPASSWD:ALL > /etc/sudoers.d/$USERNAME && \
  chmod 0440 /etc/sudoers.d/$USERNAME; \
  fi

# Configure Git safe directory (avoid Git security warnings)
RUN git config --system --add safe.directory '*'

# Switch to non-root user
USER $USERNAME

# Set working directory
WORKDIR /workspace

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node --version && python3 --version || exit 1

