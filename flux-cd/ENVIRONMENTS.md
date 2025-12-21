# Staging and Production Environments

## Overview

This document describes the Staging and Production environments for the Super-Todo application deployed via Flux CD.

## Environment Comparison

| Feature | Staging | Production |
|---------|---------|-----------|
| **Namespace** | `staging` | `production` |
| **Replicas** | 1 | 2-5 (HPA) |
| **PostgreSQL** | Single instance (dev) | 3-node HA cluster |
| **Redis** | Standalone | 6-node cluster |
| **Storage** | 5Gi (PG), 2Gi (Redis) | 50Gi (PG), 20Gi (Redis) |
| **Ingress Domain** | app.staging.local | app.staging |
| **Resource Limits** | None | CPU: 250m-1000m, Memory: 256Mi-1Gi |
| **HPA** | Disabled | Enabled (2-5 pods) |
| **Monitoring** | Disabled | Enabled |
| **Backups** | Disabled | Enabled (S3) |
| **Logging** | Debug | Warning |
| **Network Policies** | Basic | Strict |

## Directory Structure

```
flux-cd/
├── namespaces/
│   ├── kustomization.yaml
│   ├── staging-namespace.yaml
│   └── production-namespace.yaml
├── infrastructure/
│   ├── postgres/
│   │   ├── helmrepository.yaml
│   │   ├── staging/
│   │   │   └── helmrelease.yaml
│   │   └── production/
│   │       └── helmrelease.yaml
│   └── redis/
│       ├── helmrepository.yaml
│       ├── staging/
│       │   └── helmrelease.yaml
│       └── production/
│           └── helmrelease.yaml
├── apps/
│   └── super-todo/
│       ├── staging/
│       │   └── helmrelease.yaml
│       └── production/
│           └── helmrelease.yaml
└── clusters/
    └── my-cluster/
        ├── kustomization.yaml
        └── super-todo-helmchart.yaml
```

## Staging Environment

### Purpose
Development and testing environment for validating changes before production deployment.

### Characteristics
- **Low resource requirements**: Single pod replica, minimal resource limits
- **Debug-friendly**: Verbose logging, easier access for debugging
- **Fast iteration**: No HA overhead, quick deployments
- **Cost-effective**: Minimal infrastructure overhead

### Configuration Details

#### Namespace: `staging`
```bash
kubectl get namespace staging -o yaml
```

**Features:**
- Resource quota: 4 CPU, 8Gi memory
- Network policies: Allow internal communication
- ServiceAccount: `super-todo` with read-only permissions

#### PostgreSQL Staging
- **Instance Count**: 1 (no replication)
- **Database Name**: `todos_db_staging`
- **Storage**: 5Gi
- **Memory**: 256Mi (requests), 512Mi (limits)
- **CPU**: 100m (requests), 500m (limits)
- **Parameters**: Optimized for development (reduced cache, connections)
- **Connection String**:
  ```
  postgresql://postgres:staging-dev-password-123@postgres-staging.staging.svc.cluster.local:5432/todos_db_staging
  ```

#### Redis Staging
- **Mode**: Standalone (single node)
- **Storage**: 2Gi
- **Memory**: 64Mi (requests), 256Mi (limits)
- **CPU**: 50m (requests), 200m (limits)
- **Authentication**: `staging-dev-redis-123`
- **Connection String**:
  ```
  redis://:staging-dev-redis-123@redis-staging.staging.svc.cluster.local:6379
  ```

#### Super-Todo Staging
- **Replicas**: 1
- **Image**: `andreqko/super-todo:latest`
- **Resources**: No limits (uses defaults from LimitRange)
- **Ingress**: `app.staging.local`
- **Log Level**: DEBUG
- **Node Environment**: staging
- **Health Checks**: Enabled

### Accessing Staging

```bash
# Get all resources
kubectl get all -n staging

# Port-forward to super-todo
kubectl port-forward -n staging svc/super-todo 3000:80

# Access via browser
http://localhost:3000

# Connect to PostgreSQL
kubectl port-forward -n staging svc/postgres-staging 5432:5432
psql -h localhost -U postgres -d todos_db_staging

# Connect to Redis
kubectl port-forward -n staging svc/redis-staging 6379:6379
redis-cli -a staging-dev-redis-123

# View logs
kubectl logs -f -n staging -l app.kubernetes.io/name=super-todo
```

### Deploying to Staging

1. **Make changes locally**
   ```bash
   # Edit files in flux-cd/apps/super-todo/staging/
   # Or update Helm chart in flux-cd/charts/super-todo/
   ```

2. **Commit and push to GitHub**
   ```bash
   git add flux-cd/
   git commit -m "Update staging deployment"
   git push origin main
   ```

3. **Flux automatically reconciles**
   ```bash
   # Monitor deployment
   kubectl get helmrelease -n staging -w
   
   # Check logs
   flux logs --all-namespaces --follow
   ```

4. **Verify deployment**
   ```bash
   kubectl get pods -n staging
   kubectl describe pod -n staging -l app.kubernetes.io/name=super-todo
   ```

### Troubleshooting Staging

```bash
# Check HelmRelease status
kubectl describe helmrelease super-todo -n staging

# View deployment events
kubectl get events -n staging --sort-by='.lastTimestamp'

# Check pod logs
kubectl logs -n staging -l app.kubernetes.io/name=super-todo

# Debug database connection
kubectl exec -it -n staging $(kubectl get pod -n staging -l app.kubernetes.io/name=super-todo -o jsonpath='{.items[0].metadata.name}') -- \
  env | grep DATABASE

# Test database
kubectl exec -n staging postgres-staging-1 -- psql -U postgres -d todos_db_staging -c "SELECT 1"
```

## Production Environment

### Purpose
Live environment serving end users with high availability and reliability.

### Characteristics
- **High Availability**: 3-node PostgreSQL cluster, 6-node Redis cluster
- **Auto-scaling**: HPA scales from 2-5 pods based on load
- **Production-Ready**: Strict resource limits, comprehensive monitoring
- **Backup & Recovery**: Automated S3 backups for PostgreSQL
- **Security**: Network policies, Pod Disruption Budgets, strict RBAC

### Configuration Details

#### Namespace: `production`
```bash
kubectl get namespace production -o yaml
```

**Features:**
- Resource quota: 10 CPU, 20Gi memory
- LimitRange: Default 500m CPU, 512Mi memory per pod
- Network policies: Strict ingress/egress rules
- ServiceAccount: `super-todo` with extended permissions
- PodDisruptionBudget: Minimum 2 available pods

#### PostgreSQL Production
- **Instance Count**: 3 (HA with automatic failover)
- **Database Name**: `todos_db_production`
- **Storage**: 50Gi (larger for production data)
- **Memory**: 1Gi (requests), 2Gi (limits)
- **CPU**: 500m (requests), 2000m (limits)
- **Parameters**: Production-optimized (larger buffers, connection limits)
- **Monitoring**: Enabled with Prometheus integration
- **Backups**: 
  - Retention: 7 days
  - Destination: S3 (`s3://super-todo-backups/postgres-production`)
  - WAL archiving: Enabled
  - Max parallel uploads: 4
- **Pod Disruption Budget**: Minimum 2 available replicas
- **Connection String**:
  ```
  postgresql://postgres:production-secure-password-change-me-789@postgres-production.production.svc.cluster.local:5432/todos_db_production
  ```

#### Redis Production
- **Mode**: Cluster (6 nodes with 1 replica each)
- **Storage**: 20Gi per node
- **Memory**: 256Mi (requests), 1Gi (limits)
- **CPU**: 200m (requests), 1000m (limits)
- **Authentication**: `production-secure-redis-password-change-me`
- **Persistence**: AOF + RDB
- **Max Memory**: 1024MB with LRU eviction
- **Monitoring**: Enabled with Prometheus ServiceMonitor
- **Pod Disruption Budget**: Minimum 3 available nodes
- **Update Strategy**: Rolling update, max 1 unavailable
- **Connection String**:
  ```
  redis://:production-secure-redis-password-change-me@redis-production.production.svc.cluster.local:6379
  ```

#### Super-Todo Production
- **Replicas**: 2-5 (auto-scaling enabled)
- **Image**: `andreqko/super-todo:latest`
- **Resources**: 
  - Requests: 250m CPU, 256Mi memory
  - Limits: 1000m CPU, 1Gi memory
- **Ingress**: `app.staging` (HTTPS enforced)
- **Log Level**: WARN
- **Node Environment**: production
- **Health Checks**: Enabled (30s initial delay)
- **Pod Anti-Affinity**: Required across nodes
- **Topology Spread**: Balanced across availability zones
- **HPA Settings**:
  - Min replicas: 2
  - Max replicas: 5
  - Target CPU: 80%
  - Target Memory: 80%

### Auto-Scaling in Production

The Horizontal Pod Autoscaler (HPA) automatically scales super-todo based on resource usage:

```bash
# View HPA status
kubectl get hpa -n production

# Describe HPA
kubectl describe hpa super-todo -n production

# View scaling events
kubectl get events -n production --field-selector involvedObject.kind=HorizontalPodAutoscaler

# Current replicas
kubectl get deployment -n production super-todo -o jsonpath='{.spec.replicas}'
```

**Scaling Behavior:**
- Scales up when CPU > 80% OR Memory > 80%
- Scales down gradually (stabilization window: 5 minutes)
- Minimum 2 pods for redundancy
- Maximum 5 pods to control costs

### Accessing Production

```bash
# Get all resources
kubectl get all -n production

# Port-forward to super-todo (if needed)
kubectl port-forward -n production svc/super-todo 3000:80

# Access via ingress
https://app.staging  # (requires valid certificate and DNS)

# Connect to PostgreSQL
kubectl port-forward -n production svc/postgres-production 5432:5432
psql -h localhost -U postgres -d todos_db_production

# Connect to Redis
kubectl port-forward -n production svc/redis-production 6379:6379
redis-cli -a production-secure-redis-password-change-me

# View logs
kubectl logs -f -n production -l app.kubernetes.io/name=super-todo

# View metrics
kubectl top pods -n production
kubectl top nodes
```

### Deploying to Production

⚠️ **Important**: Production deployments should be carefully planned and tested in staging first.

1. **Test in Staging First**
   ```bash
   # Deploy to staging
   # Run integration tests
   # Verify functionality
   # Check performance
   ```

2. **Merge to main branch** (after code review)
   ```bash
   git checkout main
   git pull origin main
   ```

3. **Tag a release**
   ```bash
   git tag -a v1.0.0 -m "Production release 1.0.0"
   git push origin v1.0.0
   ```

4. **Update production values**
   ```bash
   # Edit flux-cd/apps/super-todo/production/helmrelease.yaml
   # Update image tag if needed
   ```

5. **Commit to main**
   ```bash
   git add flux-cd/
   git commit -m "Release v1.0.0 to production"
   git push origin main
   ```

6. **Flux automatically reconciles**
   ```bash
   # Monitor deployment
   kubectl get helmrelease -n production -w
   
   # Check pod rolling update
   kubectl get pods -n production --watch
   ```

7. **Verify deployment**
   ```bash
   # Check all pods are running
   kubectl get pods -n production
   
   # Check HPA is working
   kubectl get hpa -n production
   
   # Verify via ingress
   curl https://app.staging/todos
   ```

### Monitoring Production

```bash
# Resource usage
kubectl top pods -n production
kubectl top nodes

# Pod status
kubectl get pods -n production

# Recent events
kubectl get events -n production --sort-by='.lastTimestamp' | tail -20

# Application logs (last 100 lines)
kubectl logs -n production -l app.kubernetes.io/name=super-todo --tail=100

# Follow logs in real-time
kubectl logs -f -n production -l app.kubernetes.io/name=super-todo

# Database metrics
kubectl exec -it -n production postgres-production-1 -c postgres -- \
  psql -U postgres -d todos_db_production -c "SELECT version();"

# Redis info
kubectl exec -it -n production redis-production-0 -- \
  redis-cli -a production-secure-redis-password-change-me info
```

### Troubleshooting Production

```bash
# Check HelmRelease status
kubectl describe helmrelease super-todo -n production

# Check if scaling is working
kubectl get hpa super-todo -n production
kubectl get replicaset -n production

# View recent events
kubectl get events -n production --sort-by='.lastTimestamp'

# Check pod resource usage vs limits
kubectl top pods -n production

# Describe failing pod
kubectl describe pod -n production <pod-name>

# View pod logs
kubectl logs -n production <pod-name>

# Check database connectivity
kubectl exec -n production <pod-name> -- \
  env | grep DATABASE_URL

# Test database from pod
kubectl exec -it -n production <pod-name> -- \
  sh -c 'nc -zv postgres-production.production.svc.cluster.local 5432'

# Check Redis connectivity
kubectl exec -it -n production <pod-name> -- \
  sh -c 'redis-cli -h redis-production.production.svc.cluster.local ping'
```

## Secrets Management

### Current Approach (Development)
Secrets are stored in HelmRelease YAML files (plain text). ⚠️ **NOT suitable for production!**

### Recommended for Production

#### Option 1: Sealed Secrets
```bash
# Install sealed-secrets controller
kubectl apply -f https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.24.0/controller.yaml

# Seal a secret
echo -n "your-secret" | kubectl create secret generic db-password \
  --dry-run=client \
  --from-file=password=/dev/stdin \
  -o yaml | \
  kubeseal -f - > db-password-sealed.yaml

# Commit sealed secret to Git
git add db-password-sealed.yaml
git commit -m "Add sealed PostgreSQL password"
```

#### Option 2: External Secrets Operator
```bash
# Install External Secrets Operator
helm repo add external-secrets https://charts.external-secrets.io
helm install external-secrets \
  external-secrets/external-secrets \
  -n external-secrets-system \
  --create-namespace

# Reference AWS Secrets Manager
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: aws-secrets
spec:
  provider:
    aws:
      service: SecretsManager
      region: us-east-1
      auth:
        jwt:
          serviceAccountRef:
            name: external-secrets-operator
```

#### Option 3: HashiCorp Vault
```bash
# Install Vault agent injector
helm repo add hashicorp https://helm.releases.hashicorp.com
helm install vault hashicorp/vault
```

### Updating Secrets

```bash
# Staging secrets
kubectl patch secret postgres-staging-credentials -n staging \
  -p '{"stringData":{"password":"new-password"}}'

# Production secrets (use sealed secrets!)
# Never commit plain text secrets to Git
```

## Backup and Restore

### PostgreSQL Backups (Production Only)

Automated backups are configured in production:

```bash
# Check backup status
kubectl describe cluster postgres-production -n production

# View backup logs
kubectl logs -f -n production postgres-production-1 -c postgres

# List backups
aws s3 ls s3://super-todo-backups/postgres-production/

# Restore from backup
# Instructions in CloudNativePG documentation
```

### Manual Backup

```bash
# PostgreSQL
kubectl exec -it -n production postgres-production-1 -c postgres -- \
  pg_dump -U postgres todos_db_production > backup.sql

# Redis
kubectl exec -it -n production redis-production-0 -- \
  redis-cli BGSAVE
```

## Monitoring and Observability

### Prometheus Metrics

Both PostgreSQL and Redis export metrics:

```bash
# Check Prometheus targets
kubectl port-forward -n monitoring svc/prometheus 9090:9090
# Navigate to http://localhost:9090/targets
```

### Recommended Metrics to Monitor

**Application:**
- Request latency
- Error rate
- Active connections

**Database:**
- Query latency
- Active connections
- Replication lag
- Disk usage

**Redis:**
- Memory usage
- Hit rate
- Connected clients
- Keys per db

## Disaster Recovery

### PostgreSQL Recovery

```bash
# Failover to replica (automatic with CloudNativePG)
# To manual failover:
kubectl patch cluster postgres-production -n production -p \
  '{"spec":{"primaryUpdateStrategy":"unsupervised"}}'
```

### Redis Recovery

```bash
# Redis cluster auto-recovers from backups
# Manual recovery:
kubectl delete pod -n production redis-production-0
# Pod is recreated with persisted data
```

## Cost Optimization

### Staging Environment
- Lower resource allocation reduces costs
- Single-instance databases save resources
- No replication overhead
- Suitable for daytime-only deployments

### Production Environment
- HPA helps control costs by scaling down during low traffic
- Consider reserved instances for predictable baseline
- Archive old data to reduce storage costs
- Use spot instances for non-critical workloads

## Security Checklist

- [ ] Update all default passwords
- [ ] Implement Sealed Secrets or External Secrets
- [ ] Enable network policies (already configured)
- [ ] Configure RBAC properly
- [ ] Enable Pod Security Policies
- [ ] Set up backup encryption
- [ ] Enable Kubernetes audit logging
- [ ] Use private container registries
- [ ] Implement image scanning
- [ ] Set up secrets rotation schedule
- [ ] Configure TLS certificates
- [ ] Monitor for security events

## Upgrade Path

### Updating Application

```bash
# 1. Test new version in staging
kubectl set image deployment/super-todo -n staging \
  super-todo=andreqko/super-todo:v1.1.0

# 2. Verify in staging

# 3. Update production
kubectl set image deployment/super-todo -n production \
  super-todo=andreqko/super-todo:v1.1.0

# 4. Monitor rollout
kubectl rollout status deployment/super-todo -n production --watch
```

### Updating PostgreSQL

```bash
# Test in staging first
# Update PostgreSQL version in staging helmrelease.yaml
# Verify data integrity

# Then update production with maintenance window
```

### Updating Redis

```bash
# Rolling update with minimal downtime
# Configured with updateStrategy.maxUnavailable=1
# Monitor from other application instances
```

## Quick Reference Commands

```bash
# Compare environments
kubectl get all -n staging
kubectl get all -n production

# Tail logs from both
kubectl logs -f -n staging -l app.kubernetes.io/name=super-todo &
kubectl logs -f -n production -l app.kubernetes.io/name=super-todo &

# Monitor HPA
kubectl get hpa -n production --watch

# Check resource usage
kubectl top pods -n staging
kubectl top pods -n production

# View infrastructure
kubectl get cluster,service -n staging
kubectl get cluster,service -n production

# Reconcile Flux
flux reconcile source git flux-system
flux reconcile helmrelease super-todo -n staging
flux reconcile helmrelease super-todo -n production

# Check Flux status
flux get helmrelease -n flux-system

# View Helm values
helm get values super-todo -n staging
helm get values super-todo -n production
```

## Support and Documentation

- **Flux CD**: https://fluxcd.io/flux/
- **Helm**: https://helm.sh/
- **CloudNativePG**: https://cloudnative-pg.io/
- **Redis**: https://redis.io/documentation/
- **PostgreSQL**: https://www.postgresql.org/docs/