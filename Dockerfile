FROM google/python

RUN apt-get update
RUN apt-get -yq install libjpeg8-dev libpng-dev libfreetype6-dev zlib1g-dev libopenjpeg-dev libwebp-dev openssl libffi-dev

WORKDIR /app
RUN virtualenv /env
ADD requirements.txt /app/requirements.txt
RUN /env/bin/pip install -r /app/requirements.txt
ADD . /app

EXPOSE 8085

ENTRYPOINT ["/env/bin/python", "/app/Htpc.py"]
