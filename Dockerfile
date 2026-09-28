# Environnement de développement et de prévisualisation. Le site produit (dist/) reste
# purement statique : ce conteneur n'est pas utilisé en production.
FROM node:24-alpine
WORKDIR /app
COPY . .
USER node
ENV HOST=0.0.0.0 PORT=8080
EXPOSE 8080
CMD ["npm", "run", "preview"]
