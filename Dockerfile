# BUILDING
#
#   docker build -t test-service -f Dockerfile .
#
#   -> build from root of this source
#
# RUNNING
#
#   docker run --rm --name test-service -p 8888:8888 test-service
#
#   -> map to 0.0.0.0:8888 so localhost 8888 works for running tests against container
#   -> if running in VirtualBox (docker-machine) ensure to port forward port 8888 in the docker-machine VM ('default')
#   -> if using docker-machine, make sure to stop machine before running node.js outside of docker:  `docker-machine stop`
#

FROM node:10.13.0

EXPOSE 8888

WORKDIR /home/node/app
COPY ./ /home/node/app/

ENV PORT 8888
ENV USERNAME adam
ENV PASSWORD c0c0nut
ENV FOLDER ./tmp

LABEL license MIT

RUN npm update

CMD ["node", "server.js"]
