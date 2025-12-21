# Infrastructure Components

This directory contains the infrastructure components required for the Super-Todo application, including PostgreSQL and Redis databases.

## Overview

The infrastructure stack consists of:

### PostgreSQL (CloudNativePG)
- **Operator**: CloudNativePG - A Kubernetes operator for PostgreSQL
- **Instances**: 3 replicas for high availability
- **Version**: PostgreSQL 16.1
- **Storage**: 10Gi persistent volume
- **Features**:
  - Automated backups
  - High availability with automatic failover
  - Monitoring with Prometheus
  - Resource limits and requests

### Redis (Bitnami Redis Cluster)
- **Operator**: Bitnami Redis Cluster Helm Chart
- **Nodes**: 6 cluster nodes (1 replica)
- **Version**: Latest stable
- **Storage**: 8Gi persistent volume
- **Features**:
  - Cluster mode for horizontal scaling
  - Password authentication
  - Persistence enabled
  - Metrics and monitoring support

## Prerequisites

- Kubernetes 1.20+
- Flux CD 2.0+
- Storage class available (default: `standard`)
- Helm 3.0+

## Installation

### Automatic via Flux CD

The infrastructure is deployed automatically through Flux CD. Once Flux is bootstrapped, the HelmRepositories and HelmReleases will be reconciled:

```bash
# Check if repositories are added
kubectl get helmrepository -n flux-system

# Check HelmRelease status
kubectl get helmrelease -n flux-system

# Monitor deployment
flux logs --all-namespaces --follow
```

### Manual Installation (for testing)

If you want to install manually:

```bash
# Add Helm repositories
helm repo add cnpg https://cloudnative-pg.io/charts
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update

# Install CloudNativePG operator
helm install cloudnative-pg cnpg/cloudnative-pg \
  --namespace flux-system \
  --create-namespace \
  --set monitoring.enabled=true

# Install Redis Cluster
helm install redis bitnami/redis-cluster \
  --namespace default \
  --values redis/values.yaml

# Create PostgreSQL cluster
kubectl apply -f postgres/helmrelease.yaml
```

## Configuration

### PostgreSQL Configuration

Edit `postgres/helmrelease.yaml` to customize:

- **Instances**: Number of PostgreSQL replicas (default: 3)
- **Storage Size**: Volume size (default: 10Gi)
- **Database Name**: `todos_db` by default
- **Credentials**: Update the postgres-credentials secret
- **Resources**: CPU and memory requests/limits
- **Parameters**: PostgreSQL server parameters in the `postgresql.parameters` section

Example: Change instance count to 5

```yaml
spec:
  instances: 5
```

### Redis Configuration

Edit `redis/helmrelease.yaml` to customize:

- **Password**: Authentication password
- **Nodes**: Total number of cluster nodes (default: 6)
- **Replicas**: Replicas per node (default: 1)
- **Storage Size**: Volume size (default: 8Gi)
- **Memory Policy**: Redis eviction policy (default: allkeys-lru)
- **Max Memory**: Maximum memory limit (default: 512mb)

Example: Enable network policies

```yaml
values:
  networkPolicy:
    enabled: true
```

## Accessing the Databases

### PostgreSQL

From within the cluster:

```bash
# Get the connection string
kubectl get secret postgres-credentials -o jsonpath='{.data.password}' | base64 -d

# Port-forward for local access
kubectl port-forward -n default svc/postgres 5432:5432

# Connect with psql
psql -h localhost -U postgres -d todos_db
```

Connection string for applications:
```
postgresql://postgres:password@postgres.default.svc.cluster.local:5432/todos_db
```

### Redis

From within the cluster:

```bash
# Get the Redis password
kubectl get secret --namespace default redis -o jsonpath="{.data.redis-password}" | base64 -d

# Port-forward for local access
kubectl port-forward -n default svc/redis 6379:6379

# Connect with redis-cli
redis-cli -h localhost -p 6379 -a <password>
```

Connection string for applications:
```
redis://:password@redis.default.svc.cluster.local:6379
```

## Monitoring

### Prometheus Integration

Both PostgreSQL and Redis export metrics for Prometheus:

```bash
# Check Prometheus targets
kubectl port-forward -n monitoring svc/prometheus 9090:9090
# Navigate to http://localhost:9090/targets
```

### Check Pod Status

```bash
# PostgreSQL pods
kubectl get pods -l cnpg.io/cluster=postgres

# Redis pods
kubectl get pods -l app.kubernetes.io/name=redis-cluster

# View logs
kubectl logs -n default -l cnpg.io/cluster=postgres
kubectl logs -n default -l app.kubernetes.io/name=redis-cluster
```

## Backup and Restore

### PostgreSQL Backups

CloudNativePG handles automated backups. To configure:

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
# Create a backup using PostgreSQL
kubectl exec -it postgres-1 -c postgres -- pg_dump -U postgres todos_db > backup.sql
```

## Troubleshooting

### PostgreSQL not starting

```bash
# Check cluster status
kubectl describe cluster postgres

# Check pod events
kubectl describe pod postgres-1

# View logs
kubectl logs postgres-1 -c postgres
```

### Redis connectivity issues

```bash
# Test Redis connectivity
kubectl run redis-test --rm -it --image=redis:7 -- redis-cli -h redis.default.svc.cluster.local ping

# Check service endpoints
kubectl get endpoints redis

# Verify password
kubectl get secret redis -o jsonpath='{.data.redis-password}' | base64 -d
```

### Persistent volume issues

```bash
# Check PVC status
kubectl get pvc

# Check storage class
kubectl get storageclass

# Describe PVC for events
kubectl describe pvc postgres-data
```

## Upgrading

### CloudNativePG Operator

```bash
helm upgrade cloudnative-pg cnpg/cloudnative-pg \
  --namespace flux-system
```

### PostgreSQL Cluster

```bash
# Update the HelmRelease
kubectl patch helmrelease cloudnative-pg \
  --type merge \
  -p '{"spec":{"values":{"imageName":"ghcr.io/cloudnative-pg/postgresql:17-1"}}}'
```

### Redis Cluster

```bash
helm upgrade redis bitnami/redis-cluster \
  --namespace default \
  -f redis/values.yaml
```

## Cleanup

⚠️ **WARNING**: This will delete all data!

```bash
# Delete Redis
helm uninstall redis --namespace default

# Delete PostgreSQL cluster
kubectl delete cluster postgres --namespace default

# Delete operators
helm uninstall cloudnative-pg --namespace flux-system
```

## Security Considerations

### Secrets Management

Currently, credentials are stored in Kubernetes Secrets. For production, consider:

- Use external secret management (Sealed Secrets, HashiCorp Vault)
- Enable encryption at rest in etcd
- Use RBAC to restrict access

### Network Policies

Enable network policies to restrict traffic:

```yaml
# Allow only super-todo pods to access databases
podSelector:
  matchLabels:
    app: super-todo
```

### TLS/SSL

Enable SSL connections for PostgreSQL and Redis:

```yaml
# PostgreSQL
postgresql:
  ssl: "on"
  sslCertFile: "/etc/ssl/certs/server.crt"
  sslKeyFile: "/etc/ssl/private/server.key"
```

## Useful Commands

```bash
# Watch infrastructure deployment
watch kubectl get helmrelease,helmrepository -n flux-system

# Get all resources
kubectl get all -n default

# Check resource usage
kubectl top pods -n default

# Stream logs
kubectl logs -f -l cnpg.io/cluster=postgres -c postgres

# Access PostgreSQL psql console
kubectl exec -it postgres-1 -c postgres -- psql -U postgres -d todos_db
```

## Support and Documentation

- CloudNativePG: https://cloudnative-pg.io/
- Bitnami Redis Helm Chart: https://github.com/bitnami/charts/tree/main/bitnami/redis-cluster
- PostgreSQL Documentation: https://www.postgresql.org/docs/
- Redis Documentation: https://redis.io/documentation
