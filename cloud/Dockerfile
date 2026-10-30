FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /srv/wevvy-cloud

COPY pyproject.toml README.md ./
COPY wevvy_cloud ./wevvy_cloud
# The relay runs as `relay`, uid 10001, not root. The uid is fixed so a bind-mounted data
# directory can be given to it on the host (chown -R 10001:10001) before the first start.
RUN pip install --no-cache-dir . \
 && groupadd --gid 10001 relay \
 && useradd --uid 10001 --gid 10001 --no-create-home --home-dir /srv/wevvy-cloud --shell /usr/sbin/nologin relay \
 && mkdir -p /srv/wevvy-cloud/data \
 && chown -R relay:relay /srv/wevvy-cloud

ENV CLOUD_DB=/srv/wevvy-cloud/data/cloud.db
VOLUME ["/srv/wevvy-cloud/data"]
EXPOSE 8787

HEALTHCHECK --interval=30s --timeout=5s CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8787/healthz', timeout=3).status == 200 else 1)"

USER relay
CMD ["wevvy-cloud", "--host", "0.0.0.0", "--port", "8787"]
