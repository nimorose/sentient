FROM node:18-alpine

RUN apk add --no-cache openssl

WORKDIR /app

COPY . .

RUN npm ci
RUN npx prisma generate
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
