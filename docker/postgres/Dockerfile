FROM postgres:17-bookworm

RUN apt-get update && \
    apt-get install -y locales && \
    sed -i 's/^# ru_RU.UTF-8/ru_RU.UTF-8/' /etc/locale.gen && \
    locale-gen && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

ENV LANG=ru_RU.UTF-8
