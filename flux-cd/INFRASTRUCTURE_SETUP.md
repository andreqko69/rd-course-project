# Infrastructure Setup Guide

## Overview

This guide explains the infrastructure components deployed via Flux CD for the Super-Todo application:
- **PostgreSQL**: CloudNativePG operator for high-availability PostgreSQL
- **Redis**: Bitnami Redis Cluster for caching and session management

## Directory Structure

```
flux-cd/infrastructure/
├── postgres/
│   ├── helmrelease.yaml      # CloudNativePG operator and PostgreSQL cluster
│   ├── helmrepository.yaml   # Helm repository configuration
│   └── values.yaml           # PostgreSQL customization values
├── redis/
│   ├── helmrelease.yaml      # Bitnami Redis Cluster
│   ├── helmrepository.yaml   # Helm repository configuration
│   └── values.yaml           # Redis customization values
├── kustomization.yaml        # Infrastructure Kustomization
└── README.md                 # Detailed documentation
```

## Prerequisites

- Kubernetes 1.20+
- Flux CD 2.0+ (bootstrapped)
- kubectl configured
- A storage class available (default: `standard`)

## Installation Steps

### Step 1: Verify Flux CD is Running

```bash
kubectl get pods -n flux-system
kubectl get helmrepository -n flux-system
```

### Step 2: Push Infrastructure to GitHub

```bash
cd rd-course-project
git add flux-cd/infrastructure/
git commit -m "Add infrastructure components: PostgreSQL and Redis"
git push origin main
```

### Step 3: Monitor Flux Reconciliation

Flux will automatically detect and deploy the infrastructure:

```bash
# Watch repositories
kubectl get helmrepository -n flux-system -w

# Watch releases
kubectl get helmrelease -n flux-system -w

# Stream logs
flux logs --all-namespaces --follow
```

### Step 4: Verify Deployment

```bash
# Check PostgreSQL
kubectl get pods -l cnpg.io/cluster=postgres
kubectl get cluster postgres
kubectl get service postgres

# Check Redis
kubectl get pods -l app.kubernetes.io/name=redis-cluster
kubectl get service redis

# Check PVCs
kubectl get pvc
```

## Component Details

### PostgreSQL (CloudNativePG)

**What it does:**
- Creates a highly available PostgreSQL cluster with 3 replicas
- Automated failover and recovery
- Monitoring integration
- Persistent storage

**Configuration file:** `postgres/helmrelease.yaml`

**Key settings:**
- **Instances**: 3 (for HA)
- **Database**: `todos_db`
- **Storage**: 10Gi
- **Image**: PostgreSQL 16.1
- **Port**: 5432

**Credentials:**
- Username: `postgres`
- Password: Stored in `postgres-credentials` secret
- ⚠️ **IMPORTANT**: Change the password in `postgres/helmrelease.yaml` before deploying!

**Service name:** `postgres.default.svc.cluster.local`

**Connection string for super-todo:**
```
postgresql://postgres:changeme123secure@postgres.default.svc.cluster.local:5432/todos_db
```

### Redis Cluster (Bitnami)

**What it does:**
- Creates a Redis cluster with 6 nodes (distributed caching)
- Persistence enabled for data durability
- Password authentication
- Metrics collection for monitoring

**Configuration file:** `redis/helmrelease.yaml`

**Key settings:**
- **Nodes**: 6 cluster nodes
- **Replicas per node**: 1
- **Storage**: 8Gi
- **Port**: 6379
- **Max memory**: 512MB (LRU eviction)

**Credentials:**
- Password: `redis-secure-password-123` (in the HelmRelease)
- ⚠️ **IMPORTANT**: Change this password before deploying!

**Service name:** `redis.default.svc.cluster.local`

**Connection string for super-todo:**
```
redis://:redis-secure-password-123@redis.default.svc.cluster.local:6379
```

## Accessing the Databases

### PostgreSQL

**From a pod in the cluster:**

```bash
kubectl exec -it postgres-1 -c postgres -- psql -U postgres -d todos_db
```

**Port-forward for local access:**

```bash
kubectl port-forward svc/postgres 5432:5432
psql -h localhost -U postgres -d todos_db
```

**Get the password:**

```bash
kubectl get secret postgres-credentials -o jsonpath='{.data.password}' | base64 -d
```

### Redis

**From a pod in the cluster:**

```bash
kubectl exec -it redis-cluster-0 -- redis-cli -a redis-secure-password-123
```

**Port-forward for local access:**

```bash
kubectl port-forward svc/redis 6379:6379
redis-cli -a redis-secure-password-123
```

**Test connectivity:**

```bash
kubectl run redis-test --rm -it --image=redis:7 -- \
  redis-cli -h redis.default.svc.cluster.local ping
```

## Customizing the Infrastructure

### Change PostgreSQL Replicas

Edit `postgres/helmrelease.yaml`:

```yaml
spec:
  instances: 5  # Change from 3 to 5
```

### Change PostgreSQL Storage Size

Edit `postgres/helmrelease.yaml`:

```yaml
storage:
  size: 50Gi  # Increase from 10Gi
```

### Change Redis Password

Edit `redis/helmrelease.yaml`:

```yaml
values:
  auth:
    password: "your-new-secure-password"
```

### Enable Redis Persistence Settings

Edit `redis/helmrelease.yaml`:

```yaml
values:
  redis:
    configuration: |
      maxmemory 1024mb
      maxmemory-policy allkeys-lru
      appendonly yes
      appendfsync always
```

### Apply Changes

After editing files:

```bash
git add flux-cd/infrastructure/
git commit -m "Update infrastructure configuration"
git push origin main
```

Flux will automatically reconcile the changes (usually within 1-5 minutes).

## Monitoring

### Check Helm Release Status

```bash
kubectl get helmrelease -n flux-system -o wide
kubectl describe helmrelease cloudnative-pg -n flux-system
kubectl describe helmrelease redis -n flux-system
```

### View Helm Release Events

```bash
kubectl get events -n flux-system --field-selector involvedObject.kind=HelmRelease
```

### Check Pod Logs

```bash
# PostgreSQL
kubectl logs -f postgres-1 -c postgres

# Redis
kubectl logs -f redis-cluster-0
```

### Resource Usage

```bash
kubectl top pods -l cnpg.io/cluster=postgres
kubectl top pods -l app.kubernetes.io/name=redis-cluster
```

## Troubleshooting

### PostgreSQL Cluster Not Starting

```bash
# Check cluster status
kubectl describe cluster postgres

# Check events
kubectl get events -n default --field-selector involvedObject.name=postgres

# Check pod status
kubectl describe pod postgres-1

# View logs
kubectl logs postgres-1 -c postgres
```

### Redis Cluster Initialization Issues

```bash
# Check HelmRelease status
kubectl describe helmrelease redis -n flux-system

# Check pod logs
kubectl logs redis-cluster-0

# Verify service
kubectl get endpoints redis
```

### Persistent Volume Issues

```bash
# Check PVCs
kubectl get pvc

# Describe PVC
kubectl describe pvc postgres-data

# Check storage class
kubectl get storageclass
```

### Network Connectivity

```bash
# Test PostgreSQL from a pod
kubectl run pg-test --rm -it --image=postgres:16 -- \
  psql -h postgres.default.svc.cluster.local -U postgres -d todos_db

# Test Redis from a pod
kubectl run redis-test --rm -it --image=redis:7 -- \
  redis-cli -h redis.default.svc.cluster.local ping
```

## Security Considerations

### Credentials Management

⚠️ **Current Issue:** Credentials are stored in plain text in HelmRelease YAML files.

**For Production, implement one of:**

1. **Sealed Secrets** (Recommended):
   ```bash
   kubectl apply -f https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.24.0/controller.yaml
   
   # Seal secrets
   echo -n changeme123secure | kubectl create secret generic postgres-creds \
     --dry-run=client \
     --from-file=password=/dev/stdin \
     -o yaml | \
     kubeseal -f - > postgres-sealed-secret.yaml
   ```

2. **External Secrets Operator**:
   - Integrates with HashiCorp Vault, AWS Secrets Manager, etc.

3. **Kubernetes Secrets with Encryption at Rest**:
   - Enable etcd encryption in your cluster

### Network Policies

Restrict database access to specific pods:

```bash
# Enable network policies in Redis
kubectl patch helmrelease redis -n flux-system --type merge -p \
  '{"spec":{"values":{"networkPolicy":{"enabled":true}}}}'
```

### Database User Permissions

Connect to PostgreSQL and create a restricted user:

```bash
# Connect as postgres
kubectl exec -it postgres-1 -c postgres -- psql -U postgres -d todos_db

# Create application user
CREATE USER super_todo WITH PASSWORD 'app-specific-password';
GRANT CONNECT ON DATABASE todos_db TO super_todo;
GRANT USAGE ON SCHEMA public TO super_todo;
GRANT CREATE ON SCHEMA public TO super_todo;
```

## Backup and Restore

### PostgreSQL Backups

CloudNativePG can backup to object storage (S3, MinIO, etc.).

Enable in `postgres/helmrelease.yaml`:

```yaml
spec:
  backup:
    barmanObjectStore:
      destinationPath: s3://my-bucket/postgres-backups
      s3Credentials:
        accessKeyId:
          name: s3-credentials
          key: access-key
        secretAccessKey:
          name: s3-credentials
          key: secret-key
```

### Manual Backup

```bash
# PostgreSQL
kubectl exec -it postgres-1 -c postgres -- \
  pg_dump -U postgres todos_db > backup.sql

# Redis
kubectl exec -it redis-cluster-0 -- \
  redis-cli BGSAVE

kubectl cp default/redis-cluster-0:data/dump.rdb ./redis-backup.rdb
```

## Upgrading Components

### PostgreSQL Operator

```bash
# Edit HelmRelease
kubectl edit helmrelease cloudnative-pg -n flux-system

# Change version
spec:
  chart:
    spec:
      version: "0.22.x"  # Update version
```

### PostgreSQL Cluster Version

```bash
# Update imageName in postgres/helmrelease.yaml
imageName: ghcr.io/cloudnative-pg/postgresql:17-1

# Commit and push
git add flux-cd/infrastructure/
git commit -m "Upgrade PostgreSQL to version 17"
git push origin main
```

### Redis Cluster

```bash
# Update HelmRelease version
kubectl edit helmrelease redis -n flux-system

# Change version
spec:
  chart:
    spec:
      version: "10.x"  # Update version
```

## Cleanup

⚠️ **WARNING:** This will delete all data permanently!

```bash
# Delete Redis
kubectl delete helmrelease redis -n flux-system

# Delete PostgreSQL cluster
kubectl delete cluster postgres -n default

# Delete CloudNativePG operator
kubectl delete helmrelease cloudnative-pg -n flux-system

# Verify deletion
kubectl get pods -n default
kubectl get pvc
```

## Quick Reference Commands

```bash
# Check all infrastructure
kubectl get helmrelease,helmrepository -n flux-system
kubectl get cluster,service -n default

# Watch deployments
watch kubectl get pods -n default

# Get connection info
kubectl get secret postgres-credentials -o jsonpath='{.data}' | jq .
kubectl get secret redis -o jsonpath='{.data}' | jq .

# Test connections
kubectl run pg-test --rm -it --image=postgres:16 -- psql -h postgres -U postgres
kubectl run redis-test --rm -it --image=redis:7 -- redis-cli -h redis ping

# View infrastructure logs
flux logs --all-namespaces --follow --component source-controller
flux logs --all-namespaces --follow --component helm-controller

# Get resource usage
kubectl top pods -n default

# Stream pod logs
kubectl logs -f postgres-1 -c postgres
kubectl logs -f redis-cluster-0
```

## Next Steps

1. **Update Super-Todo Deployment**: Ensure the Helm chart uses correct connection strings:
   - Database: `postgresql://postgres:password@postgres.default.svc.cluster.local:5432/todos_db`
   - Redis: `redis://:password@redis.default.svc.cluster.local:6379`

2. **Deploy Super-Todo**: Push your application with proper secret references

3. **Enable Monitoring**: Install Prometheus and Grafana to monitor databases

4. **Setup Backups**: Configure automated backups for PostgreSQL

5. **Security Hardening**: Implement Sealed Secrets or External Secrets

## Support and Documentation

- **CloudNativePG**: https://cloudnative-pg.io/
- **Bitnami Redis Helm Chart**: https://github.com/bitnami/charts/tree/main/bitnami/redis-cluster
- **PostgreSQL Docs**: https://www.postgresql.org/docs/
- **Redis Docs**: https://redis.io/documentation/
- **Flux CD Docs**: https://fluxcd.io/flux/
