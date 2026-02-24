pipeline {

  agent any

  environment {
    IMAGE_NAME = "bir_backend"
    CONTAINER_NAME = "bir_backend"
    HOST_PORT = "5010"
    CONTAINER_PORT = "5010"

    SERVER_ENV = "/opt/apps/all-in-the-ring-backend/.env"
    SERVER_CONFIG_DIR = "/opt/apps/all-in-the-ring-backend/config"
    SERVER_UPLOAD_DIR = "/opt/apps/all-in-the-ring-backend/uploads"
  }

  stages {

    stage('Checkout') {
      steps {
        checkout scm
        script {
          COMMIT = sh(returnStdout: true, script: 'git rev-parse --short HEAD').trim()
          env.IMAGE_TAG = "${IMAGE_NAME}:${COMMIT}"
        }
      }
    }

    stage('Build Docker Image') {
      steps {
        echo "🧱 Building Docker image: ${IMAGE_TAG}"
        sh '''
          docker build -t ${IMAGE_TAG} .
          docker tag ${IMAGE_TAG} ${IMAGE_NAME}:latest || true
        '''
      }
    }

    stage('Prepare Host Directories') {
      steps {
        echo "📂 Ensuring persistent uploads directory exists on host..."
        sh '''
          mkdir -p ${SERVER_UPLOAD_DIR}
          chmod -R 777 ${SERVER_UPLOAD_DIR} || true
        '''
      }
    }

    stage('Deploy') {
      steps {
        echo "🚀 Deploying ${CONTAINER_NAME} on port ${HOST_PORT}"
        sh '''
          set -e
          docker stop ${CONTAINER_NAME} || true
          docker rm ${CONTAINER_NAME} || true

          docker run -d \
            --name ${CONTAINER_NAME} \
            --restart unless-stopped \
            -p ${HOST_PORT}:${CONTAINER_PORT} \
            -v ${SERVER_ENV}:/app/.env:ro \
            -v ${SERVER_CONFIG_DIR}:/app/config:ro \
            -v ${SERVER_UPLOAD_DIR}:/app/uploads \
            ${IMAGE_TAG}
        '''
      }
    }

    stage('Cleanup') {
      steps {
        echo "🧹 Cleaning up old Docker images..."
        sh "docker image prune -f || true"
      }
    }
  }

  post {
    success {
      echo "✅ Backend deployed successfully!"
      echo "🌐 Running on: https://backintheringapp.no (port ${HOST_PORT})"
      echo "📁 Persistent uploads directory: ${SERVER_UPLOAD_DIR}"
    }
    failure {
      echo "❌ Deployment failed. Check Jenkins and container logs."
    }
  }
}
