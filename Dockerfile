# This line tells Docker what base image to start with
# Think of it like inheriting from a parent class that already has Node.js installed
FROM node:18-alpine

# Set the working directory inside the container
# This is like doing 'cd /app' - all subsequent commands will run from this directory
WORKDIR /app

# Copy package files first, before copying the rest of your code
# This is a performance optimization - Docker caches layers, so if your dependencies
# don't change, it can skip reinstalling them even if your source code changes
COPY package*.json ./

# Install dependencies inside the container
# npm ci is like npm install but faster and more reliable for production
RUN npm ci

# Now copy the rest of your application code
COPY . .

# Build your Next.js application for production
# This creates an optimized version of your app
RUN npm run build

# Tell Docker that your app listens on port 3000
# This doesn't actually publish the port - it's documentation and a hint for later
EXPOSE 3000

# Define the command that runs when the container starts
# This is equivalent to running 'npm start' in your terminal
CMD ["npm", "start"]