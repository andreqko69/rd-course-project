# Super-Todo Helm Chart

A production-ready Helm chart for deploying the Super-Todo NestJS application on Kubernetes.

## Overview

This Helm chart provides a complete deployment solution for the Super-Todo application with:
- Kubernetes Deployment with configurable replicas
- Service for internal networking
- Secret management for sensitive credentials
- ServiceAccount with RBAC support
- Health checks (liveness and readiness probes)
- Resource limits and requests
- Pod anti-affinity for high availability
- Security context with non-root user
- Optional HPA (Horizontal Pod Autoscaling)
- Optional Ingress configuration

## Prerequisites

- Kubernetes 1.20+
- Helm 3.0+
- Docker image of super-todo available in a registry

## Installation

Add the Helm repository (if using a Helm repo):

```bash
helm repo add super-todo https://your-helm-repo.com
helm repo update
```

Install the chart:

```bash
helm install super-todo ./super-todo \
  --namespace default \
  --create-namespace
```

Or with custom values:

```bash
helm install super-todo ./super-todo \
  --namespace default \
  -f values.yaml \
  -f values-staging.yaml
```

## Configuration

### Key Values

| Parameter | Description | Default |
|-----------|-------------|---------|
| `replicaCount` | Number of replicas | `2` |
| `image.repository` | Docker image repository | `andreqko/super-todo` |
| `image.tag` | Docker image tag | `latest` |
| `service.type` | Kubernetes service type | `ClusterIP` |
| `service.port` | Service port | `80` |
| `ingress.enabled` | Enable Ingress | `false` |
| `resources.requests.cpu` | CPU request | `100m` |
| `resources.requests.memory` | Memory request | `128Mi` |
| `resources.limits.cpu` | CPU limit | `500m` |
| `resources.limits.memory` | Memory limit | `512Mi` |
| `autoscaling.enabled` | Enable HPA | `false` |
| `autoscaling.minReplicas` | Min replicas for HPA | `2` |
| `autoscaling.maxReplicas` | Max replicas for HPA | `5` |

### Database and Redis Configuration

Update the secrets section in `values.yaml`:

```yaml
secrets:
  databaseUrl: "postgresql://user:password@postgres:5432/todos_db"
  redisUrl: "redis://redis:6379"
```

### Ingress Configuration

Enable and configure Ingress:

```yaml
ingress:
  enabled: true
  className: "nginx"
  hosts:
    - host: super-todo.example.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: super-todo-tls
      hosts:
        - super-todo.example.com
```

### Horizontal Pod Autoscaling

Enable HPA:

```yaml
autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 5
  targetCPUUtilizationPercentage: 80
  targetMemoryUtilizationPercentage: 80
```

## Upgrading

Upgrade an existing release:

```bash
helm upgrade super-todo ./super-todo \
  --namespace default \
  -f values.yaml
```

## Uninstalling

Remove the release:

```bash
helm uninstall super-todo --namespace default
```

## Template Files

- `deployment.yaml` - Kubernetes Deployment
- `service.yaml` - Kubernetes Service
- `serviceaccount.yaml` - ServiceAccount for RBAC
- `secret.yaml` - Secrets for credentials
- `_helpers.tpl` - Helm template helpers

## Health Checks

The chart includes:
- **Liveness Probe**: Checks every 10 seconds after 30 second delay
- **Readiness Probe**: Checks every 5 seconds after 10 second delay

Both probes target the `/todos` endpoint.

## Security

The chart enforces:
- Non-root user (UID 1000)
- Read-only root filesystem
- No privilege escalation
- Dropped all Linux capabilities
- Resource limits and requests

## Development

For local testing:

```bash
# Lint the chart
helm lint ./super-todo

# Validate the chart
helm template super-todo ./super-todo

# Install in dry-run mode
helm install super-todo ./super-todo --dry-run --debug
```

## Support

For issues or questions, refer to the main repository:
https://github.com/andreqko69/rd-course-project