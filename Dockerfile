FROM node:19-alpine
WORKDIR /app
ENV LANG=C.UTF-8 \
 TZ=Asia/Tokyo
COPY package.json ./
RUN npm install
#RUN yarn install --immutable --immutable-cache --check-cache
#RUN rm -rf node_modules && yarn install --frozen-lockfile
COPY . .