// ShopLite CI/CD. Runs as a *Multibranch* Pipeline job: Jenkins creates one job per
// branch (and one per PR, named PR-<n>), and sets BRANCH_NAME for each. Later stages
// use `when { branch 'main' }`, which only works because BRANCH_NAME is set — in a
// plain "Pipeline" job it is empty and those stages would silently always skip.

pipeline {
    // Every stage runs on the CentOS agent: the controller's curl/wget crash with
    // SIGILL, and running builds on the controller is a bad idea in any case.
    agent { label 'centos' }

    options {
        // Checkout is done explicitly below so it shows up as its own stage.
        skipDefaultCheckout()
        disableConcurrentBuilds()
        timeout(time: 30, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '15'))
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
                script {
                    // Short SHA = image tag, so every image traces back to exact code.
                    // (For a PR-<n> job this is the SHA of the PR merged into main.)
                    env.IMAGE_TAG = sh(script: 'git rev-parse --short=7 HEAD', returnStdout: true).trim()
                    // Compose reads this env var as the project name. One name per branch
                    // keeps CI stacks apart from each other and from a local `shoplite`
                    // stack on the same machine — and lets post{} run `down -v` safely.
                    env.COMPOSE_PROJECT_NAME = ('shoplite-ci-' + (env.BRANCH_NAME ?: 'build'))
                        .toLowerCase().replaceAll('[^a-z0-9_-]', '-')
                }
                echo "Branch ${env.BRANCH_NAME} @ ${env.IMAGE_TAG}, compose project ${env.COMPOSE_PROJECT_NAME}"
                // Fail here, with a clear message, if the agent lacks the tools the
                // later stages assume. `--target` stage skipping needs BuildKit (buildx).
                sh '''
                    docker version --format 'docker {{.Server.Version}} ({{.Server.Arch}})'
                    docker buildx version
                    docker compose version
                    openssl version
                '''
            }
        }

        // Lint and tests run *inside* Docker build targets (see backend/Dockerfile), so
        // the agent needs no Node install and nothing is bind-mounted into the
        // workspace — no root-owned node_modules left behind for deleteDir() to trip on.
        // If the source hasn't changed, BuildKit reuses the cached result: same input,
        // same outcome, so skipping the rerun is correct.
        // `--output type=cacheonly`: we only want pass/fail, not an image. Without it every
        // build leaves two untagged images behind and the agent's disk slowly fills.
        stage('Lint') {
            steps {
                sh 'docker build --progress=plain --output type=cacheonly --target lint backend'
                sh 'docker build --progress=plain --output type=cacheonly --target lint frontend'
            }
        }

        stage('Unit tests') {
            steps {
                sh 'docker build --progress=plain --output type=cacheonly --target test backend'
            }
        }

        stage('Build images') {
            steps {
                sh '''
                    docker build --progress=plain --target runtime \
                        --build-arg APP_VERSION="$IMAGE_TAG" \
                        -t "shoplite-backend:$IMAGE_TAG" backend
                    docker image ls "shoplite-backend:$IMAGE_TAG"
                '''
                // "Built" is not "works". Without any config the backend must refuse to
                // start with exit 1 and a config error. Getting exactly that proves the
                // image runs on this CPU, node starts, and every module resolves — a
                // missing dependency would also exit 1, but with a different message.
                sh '''
                    set +e
                    out=$(docker run --rm "shoplite-backend:$IMAGE_TAG" 2>&1)
                    status=$?
                    set -e
                    echo "$out"
                    if [ "$status" -ne 1 ] || ! echo "$out" | grep -q '"msg":"invalid configuration"'; then
                        echo "Smoke test failed: expected exit 1 with a config error, got exit $status"
                        exit 1
                    fi
                    echo "Smoke test passed: image starts and fails fast on missing config"
                '''
                sh '''
                    docker build --progress=plain --target runtime \
                        -t "shoplite-frontend:$IMAGE_TAG" frontend
                    docker image ls "shoplite-frontend:$IMAGE_TAG"
                '''
                // nginx refuses to start on a bad config, so test it now rather than
                // find out from a crash-looping container after deploy.
                sh 'docker run --rm "shoplite-frontend:$IMAGE_TAG" nginx -t'
            }
        }

        // The image just built, against a real MySQL, checked with real HTTP requests.
        stage('Integration') {
            steps {
                // Throwaway secrets for a throwaway stack: fresh every build, never in git.
                // `set +x` stops Jenkins' shell tracing from printing them into the log.
                sh '''
                    set +x
                    {
                        echo "MYSQL_ROOT_PASSWORD=$(openssl rand -hex 16)"
                        echo "MYSQL_PASSWORD=$(openssl rand -hex 16)"
                        echo "JWT_SECRET=$(openssl rand -hex 32)"
                        echo "SEED_USER_EMAIL=ci@shoplite.test"
                        echo "SEED_USER_PASSWORD=$(openssl rand -hex 12)"
                        echo "FRONTEND_PORT=0"
                    } > .env
                '''
                // --no-build: test exactly the images from 'Build images', never a rebuild.
                // --wait: return only once every healthcheck passes; fail if one doesn't.
                sh 'docker compose up -d --no-build --wait --wait-timeout 180 mysql backend frontend'
                sh 'docker compose --profile test run --rm api-smoke'
            }
            post {
                always {
                    // Keep the containers' logs with the build — the first place to look
                    // when this stage goes red.
                    sh 'docker compose logs --no-color --timestamps > compose.log 2>&1 || true'
                    archiveArtifacts artifacts: 'compose.log', allowEmptyArchive: true
                }
            }
        }
    }

    post {
        always {
            // `down -v` deletes volumes, so it only ever runs for a shoplite-ci-* project.
            // If COMPOSE_PROJECT_NAME were ever unset, compose would fall back to the
            // compose file's `name: shoplite` — the local stack — and wipe its data.
            sh '''
                case "${COMPOSE_PROJECT_NAME:-}" in
                    shoplite-ci-*) docker compose --profile test down -v --remove-orphans || true ;;
                    *) echo "Not running 'down -v' for project '${COMPOSE_PROJECT_NAME:-<unset>}'" ;;
                esac
            '''
            // The build cache stays (that is what keeps rebuilds fast); only this
            // build's tagged image goes, so the agent's disk doesn't fill with one
            // image per commit.
            sh 'docker image rm "shoplite-backend:$IMAGE_TAG" "shoplite-frontend:$IMAGE_TAG" || true'
            deleteDir()
        }
    }
}
