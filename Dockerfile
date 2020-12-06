FROM node:8.9.0

RUN mkdir /src
WORKDIR /src

COPY . .
EXPOSE 3000

USER root
CMD ["npm", "run", "start"]
