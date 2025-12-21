# Deployment Guide

## Overview

This guide walks you through deploying the complete Super-Todo infrastructure and application to Kubernetes using Flux CD with staging and production environments.

## Prerequisites

- Kubernetes cluster (1.20+) with kubectl configured
- Flux CD 2.0+ bootstrapped on your cluster
- Git repository (GitHub) with Flux CD already set up
- Docker image pushed to Docker Hub: `andreqko/super-todo:latest`

## Quick Start

### 1. Verify Flux CD Installation

```bash
# Check Flux components are running
kubectl get pods -n flux-system

# Verify Flux CLI
flux version
```

### 2. Push Configuration to GitHub

```bash
# Navigate to project root
cd rd-course-project

# Add all flux-cd files
git add flux-cd/

# Commit
git commit -m "Add complete Flux CD infrastructure and application deployment

- Namespaces: staging and production
- Infrastructure: PostgreSQL (CloudNativePG) and Redis (Bitnami)
- Application: Super-Todo Helm chart with environment-specific overrides
- Staging: Single-instance databases, 1 replica, no resource limits
- Production: HA databases, 2-5 replicas with HPA, resource limits
"

# Push to main branch
git push origin main
```

### 3. Monitor Flux Reconciliation

```bash
# Watch Flux reconcile the changes
kubectl get helmrelease -n flux-system -w

# View Flux logs
flux logs --all-namespaces --follow

# Check specific components
kubectl get kustomization -n flux-system -w
kubectl get helmchart -n flux-system
```

### 4. Verify Namespace Creation

```bash
# Check namespaces exist
kubectl get namespace staging production

# Verify staging namespace
kubectl get all -n staging

# Verify production namespace
kubectl get all -n production
```

## Detailed Deployment Steps

### Step 1: Review Configuration

Before pushing, review the key configuration files:

```bash
# Staging app configuration
cat flux-cd/apps/super-todo/staging/helmrelease.yaml

# Production app configuration
cat flux-cd/apps/super-todo/production/helmrelease.yaml

# Staging infrastructure
cat flux-cd/infrastructure/postgres/staging/helmrelease.yaml
cat flux-cd/infrastructure/redis/staging/helmrelease.yaml

# Production infrastructure
cat flux-cd/infrastructure/postgres/production/helmrelease.yaml
cat flux-cd/infrastructure/redis/production/helmrelease.yaml
```

### Step 2: Update Critical Passwords

⚠️ **IMPORTANT**: Update all default passwords before deploying!

**Staging PostgreSQL:**
```bash
# Edit flux-cd/infrastructure/postgres/staging/helmrelease.yaml
# Change: stringData.password: "staging-dev-password-123"
# To: A secure password
```

**Staging Redis:**
```bash
# Edit flux-cd/infrastructure/redis/staging/helmrelease.yaml
# Change: values.auth.password: "staging-dev-redis-123"
# To: A secure password
```

**Production PostgreSQL:**
```bash
# Edit flux-cd/infrastructure/postgres/production/helmrelease.yaml
# Change: stringData.password: "production-secure-password-change-me-789"
# To: A strong secure password (32+ characters recommended)
```

**Production Redis:**
```bash
# Edit flux-cd/infrastructure/redis/production/helmrelease.yaml
# Change: values.auth.password: "production-secure-redis-password-change-me"
# To: A strong secure password
```

**Super-Todo Connection Strings:**

After updating passwords, update the connection strings in the HelmReleases:

Staging:
```bash
# flux-cd/apps/super-todo/staging/helmrelease.yaml
# Update secrets.databaseUrl and secrets.redisUrl with new passwords
```

Production:
```bash
# flux-cd/apps/super-todo/production/helmrelease.yaml
# Update secrets.databaseUrl and secrets.redisUrl with new passwords
```

### Step 3: Update Docker Image (Optional)

If you want to use a specific tag instead of `latest`:

```bash
# Edit flux-cd/apps/super-todo/staging/helmrelease.yaml
image:
  tag: "v1.0.0"  # Change from "latest"

# Edit flux-cd/apps/super-todo/production/helmrelease.yaml
image:
  tag: "v1.0.0"  # Change from "latest"
```

### Step 4: Update Ingress Domains (Optional)

**Staging domain:**
```bash
# Edit flux-cd/apps/super-todo/staging/helmrelease.yaml
# hosts:
#   - host: app.staging.local
# Update to your actual staging domain
```

**Production domain:**
```bash
# Edit flux-cd/apps/super-todo/production/helmrelease.yaml
# hosts:
#   - host: app.staging
# Update to your actual production domain
```

### Step 5: Configure AWS S3 Credentials (Production Backup)

For PostgreSQL backups in production:

```bash
# Create AWS S3 credentials secret
kubectl create secret generic aws-s3-credentials \
  --from-literal=access-key-id=YOUR_AWS_ACCESS_KEY \
  --from-literal=secret-access-key=YOUR_AWS_SECRET_KEY \
  -n production

# Or add to Sealed Secrets
```

Update in `flux-cd/infrastructure/postgres/production/helmrelease.yaml`:
```yaml
backup:
  barmanObjectStore:
    destinationPath: s3://your-bucket-name/postgres-production
    endpointURL: https://s3.amazonaws.com
```

### Step 6: Commit and Push

```bash
# Stage all changes
git add flux-cd/

# Review changes
git diff --cached flux-cd/

# Commit
git commit -m "Configure production and staging environments with secure passwords

- Updated all default passwords
- Configured ingress domains
- Set up S3 credentials for backups
"

# Push to GitHub
git push origin main
```

## Monitoring Deployment Progress

### Watch All Components

```bash
# Open multiple terminal windows

# Terminal 1: Watch namespaces
kubectl get namespace --watch

# Terminal 2: Watch infrastructure
kubectl get helmrelease -n flux-system --watch

# Terminal 3: Watch staging apps
kubectl get helmrelease -n staging --watch

# Terminal 4: Watch production apps
kubectl get helmrelease -n production --watch
```

### Check Deployment Status

```bash
# Staging PostgreSQL
kubectl get cluster postgres-staging -n staging
kubectl get pods -n staging -l cnpg.io/cluster=postgres-staging

# Staging Redis
kubectl get pods -n staging -l app.kubernetes.io/name=redis

# Production PostgreSQL
kubectl get cluster postgres-production -n production
kubectl get pods -n production -l cnpg.io/cluster=postgres-production

# Production Redis
kubectl get pods -n production -l app.kubernetes.io/name=redis-cluster

# Super-Todo Staging
kubectl get deployment -n staging super-todo
kubectl get pods -n staging -l app.kubernetes.io/name=super-todo

# Super-Todo Production
kubectl get deployment -n production super-todo
kubectl get pods -n production -l app.kubernetes.io/name=super-todo
```

### View HelmRelease Details

```bash
# Staging app
kubectl describe helmrelease super-todo -n staging

# Production app
kubectl describe helmrelease super-todo -n production

# Staging infrastructure
kubectl describe helmrelease cloudnative-pg-staging -n flux-system
kubectl describe helmrelease redis-staging -n flux-system

# Production infrastructure
kubectl describe helmrelease cloudnative-pg-production -n flux-system
kubectl describe helmrelease redis-production -n flux-system
```

## Testing the Deployment

### Test Staging Environment

```bash
# Port-forward to super-todo
kubectl port-forward -n staging svc/super-todo 3000:80

# Test endpoint
curl http://localhost:3000/todos

# Test database connectivity
kubectl exec -it -n staging postgres-staging-1 -c postgres -- \
  psql -U postgres -d todos_db_staging -c "SELECT 1"

# Test redis connectivity
kubectl exec -it -n staging redis-staging-0 -- \
  redis-cli -a staging-dev-redis-123 ping
```

### Test Production Environment

```bash
# Port-forward to super-todo
kubectl port-forward -n production svc/super-todo 3000:80

# Test endpoint
curl http://localhost:3000/todos

# Check HPA status
kubectl get hpa -n production
kubectl describe hpa super-todo -n production

# Check replicas
kubectl get deployment -n production super-todo

# Test database
kubectl exec -it -n production postgres-production-1 -c postgres -- \
  psql -U postgres -d todos_db_production -c "SELECT version();"

# Test redis
kubectl exec -it -n production redis-production-0 -- \
  redis-cli -a production-secure-redis-password-change-me ping
```

### Load Test to Trigger HPA

```bash
# Generate load to trigger auto-scaling
kubectl run -it -n production load-test --image=alpine --restart=Never -- \
  sh -c 'while true; do wget -q -O- http://super-todo/todos; done'

# Monitor HPA in another terminal
kubectl get hpa -n production --watch

# Monitor pod scaling
kubectl get pods -n production --watch
```

## Troubleshooting Deployment

### Helm Release Not Reconciling

```bash
# Check HelmRelease status
kubectl describe helmrelease super-todo -n staging

# Check for errors
kubectl get helmrelease super-todo -n staging -o jsonpath='{.status.conditions}'

# View Helm release history
helm history super-todo -n staging

# Manually trigger reconciliation
kubectl annotate helmrelease super-todo \
  -n staging \
  reconcile.fluxcd.io/requestedAt="$(date +%s)" \
  --overwrite
```

### Pods Not Starting

```bash
# Check pod status
kubectl describe pod -n staging <pod-name>

# View pod logs
kubectl logs -n staging <pod-name>

# Check for resource constraints
kubectl describe nodes

# Check PVC status
kubectl get pvc -n staging
kubectl get pvc -n production
```

### Database Connection Issues

```bash
# Check service endpoints
kubectl get endpoints -n staging
kubectl get endpoints -n production

# Test from pod
kubectl exec -it -n staging <pod-name> -- \
  sh -c 'nc -zv postgres-staging.staging.svc.cluster.local 5432'

# Check firewall/network policies
kubectl get networkpolicy -n staging
kubectl get networkpolicy -n production
```

### Image Pull Issues

```bash
# Check image pull events
kubectl get events -n staging --field-selector reason=Failed

# Verify image exists
docker pull andreqko/super-todo:latest

# Check image pull secrets
kubectl get secrets -n staging
kubectl get secrets -n production
```

## Post-Deployment Verification

### 1. Check All Namespaces

```bash
kubectl get namespace
# Should see: default, flux-system, staging, production
```

### 2. Check All Resources

```bash
# Staging
kubectl get all -n staging

# Production
kubectl get all -n production

# Infrastructure (in flux-system)
kubectl get helmrelease -n flux-system
```

### 3. Verify Persistent Volumes

```bash
# Check PVCs are bound
kubectl get pvc -n staging
kubectl get pvc -n production

# Check PV status
kubectl get pv
```

### 4. Check Resource Usage

```bash
# Staging
kubectl top pods -n staging
kubectl top nodes

# Production
kubectl top pods -n production
```

### 5. Verify Ingress

```bash
# Check ingress resources
kubectl get ingress -n staging
kubectl get ingress -n production

# Get ingress details
kubectl describe ingress super-todo -n staging
kubectl describe ingress super-todo -n production
```

### 6. Test Connectivity

```bash
# Test staging from pod
kubectl run -it --rm test --image=curlimages/curl -n staging -- \
  curl http://super-todo/todos

# Test production from pod
kubectl run -it --rm test --image=curlimages/curl -n production -- \
  curl http://super-todo/todos
```

## Updating Deployments

### Update Application Code

```bash
# 1. Make code changes
# 2. Build and push new Docker image
docker build -t andreqko/super-todo:v1.1.0 .
docker push andreqko/super-todo:v1.1.0

# 3. Update image tag in staging
kubectl set image deployment/super-todo \
  -n staging \
  super-todo=andreqko/super-todo:v1.1.0

# 4. Verify in staging
kubectl rollout status deployment/super-todo -n staging

# 5. Update image tag in production
kubectl set image deployment/super-todo \
  -n production \
  super-todo=andreqko/super-todo:v1.1.0

# 6. Monitor rollout
kubectl rollout status deployment/super-todo -n production
```

### Update Infrastructure

```bash
# Edit configuration files
# Example: Update PostgreSQL replicas

# flux-cd/infrastructure/postgres/production/helmrelease.yaml
# Change: instances: 3 -> instances: 5

# Commit and push
git add flux-cd/infrastructure/
git commit -m "Scale PostgreSQL to 5 replicas"
git push origin main

# Flux automatically reconciles
```

### Rollback Deployment

```bash
# Rollback application
kubectl rollout undo deployment/super-todo -n staging
kubectl rollout undo deployment/super-todo -n production

# Rollback Helm release
helm rollback super-todo -n staging
helm rollback super-todo -n production

# Using Flux
flux suspend helmrelease super-todo -n staging
flux resume helmrelease super-todo -n staging
```

## Scaling and Performance Tuning

### Manual Scaling

```bash
# Scale staging (if needed)
kubectl scale deployment super-todo --replicas=2 -n staging

# Scale production (use HPA instead)
# HPA handles scaling automatically
```

### Monitor HPA Performance

```bash
# Watch HPA decisions
kubectl get hpa -n production --watch

# View detailed metrics
kubectl top pods -n production
kubectl top nodes

# Check if scaling is working
kubectl get events -n production | grep HorizontalPodAutoscaler
```

### Adjust HPA Limits

```bash
# Edit HPA settings
kubectl edit hpa super-todo -n production

# Or patch directly
kubectl patch hpa super-todo -n production -p \
  '{"spec":{"maxReplicas":10,"minReplicas":3}}'
```

## Maintenance Tasks

### Backup Databases

```bash
# PostgreSQL manual backup
kubectl exec -it -n production postgres-production-1 -c postgres -- \
  pg_dump -U postgres todos_db_production > backup.sql

# Redis manual backup
kubectl exec -it -n production redis-production-0 -- \
  redis-cli BGSAVE
```

### View Logs

```bash
# Real-time logs
kubectl logs -f -n staging -l app.kubernetes.io/name=super-todo
kubectl logs -f -n production -l app.kubernetes.io/name=super-todo

# Last N lines
kubectl logs -n production -l app.kubernetes.io/name=super-todo --tail=100

# Previous logs (if pod restarted)
kubectl logs -n production <pod-name> --previous
```

### Monitor Health

```bash
# Check pod restarts
kubectl get pods -n staging -o wide
kubectl get pods -n production -o wide

# View events
kubectl get events -n staging --sort-by='.lastTimestamp'
kubectl get events -n production --sort-by='.lastTimestamp'

# Check readiness
kubectl exec -n staging <pod-name> -- curl localhost:3000/todos
kubectl exec -n production <pod-name> -- curl localhost:3000/todos
```

## Next Steps

1. **Setup Monitoring**: Install Prometheus and Grafana
2. **Configure Logging**: Setup ELK or Loki for centralized logging
3. **Enable Backups**: Configure automated S3 backups for databases
4. **Setup CI/CD**: Configure automatic Docker image builds on code push
5. **Security Hardening**: Implement Sealed Secrets for password management
6. **Configure Alerts**: Setup alerting for resource usage and errors
7. **Document Runbooks**: Create operational runbooks for common issues

## Support

For issues, refer to:
- Flux CD Documentation: https://fluxcd.io/flux/
- Helm Documentation: https://helm.sh/docs/
- CloudNativePG: https://cloudnative-pg.io/documentation/
- Kubernetes: https://kubernetes.io/docs/

## Checklist

Before considering deployment complete:

- [ ] Both namespaces created (staging, production)
- [ ] PostgreSQL clusters running (staging: 1, production: 3)
- [ ] Redis clusters running (staging: standalone, production: 6 nodes)
- [ ] Super-Todo pods running in both environments
- [ ] Staging super-todo accessible
- [ ] Production super-todo accessible
- [ ] HPA working in production
- [ ] All passwords updated from defaults
- [ ] Database connectivity verified
- [ ] Redis connectivity verified
- [ ] Resource quotas enforced
- [ ] Network policies active
- [ ] Ingress configured (if applicable)
- [ ] Monitoring enabled in production
- [ ] Backups configured for production databases