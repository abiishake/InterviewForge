# TOPIC --- AKS Operations: Node Pools, Scaling, Identity, Ingress and ACR
**topic_id:** `aks-ops`
**priority:** `Core`

## aks-ops-001 --- How do node pools, the cluster autoscaler and HPA work together in AKS?

**question_id:** `aks-ops-001`\
**topic_id:** `aks-ops`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical`

**Question**

How do node pools, the cluster autoscaler and HPA work together in AKS?

**Answer**

A **node pool** is a group of identically sized VMs; use a *system* pool for cluster components and separate *user* pools per workload type (general, memory-heavy, GPU, spot) selected with node selectors, taints and tolerations. The **Horizontal Pod Autoscaler** changes pod replicas from CPU/memory or custom metrics (KEDA for queue length). When pods become unschedulable the **cluster autoscaler** adds nodes in a pool, and removes underused nodes after a cool-down. They only work if pods declare **resource requests**; otherwise HPA percentages are meaningless and the scheduler cannot pack nodes. Add PodDisruptionBudgets for safe scale-down and upgrades, and zone-spread pools for availability.

Real-world example: a user node pool tainted for memory-heavy workloads plus an HPA.

```yaml
# az aks nodepool add --cluster-name aks1 -g rg --name mem --node-vm-size Standard_E4s_v5 \
#   --node-taints workload=memory:NoSchedule --enable-cluster-autoscaler --min-count 1 --max-count 6
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata: { name: report-api }
spec:
  scaleTargetRef: { apiVersion: apps/v1, kind: Deployment, name: report-api }
  minReplicas: 2
  maxReplicas: 12
  metrics:
    - type: Resource
      resource: { name: cpu, target: { type: Utilization, averageUtilization: 65 } }
```

**Keywords:** `node pool, cluster autoscaler, HPA, KEDA, taints, requests, PodDisruptionBudget`

**Follow-ups:**

-   Why can HPA scale pods yet pods stay Pending?
-   When use spot node pools?
-   How do PodDisruptionBudgets protect upgrades?

## aks-ops-002 --- How do pods authenticate to Azure services in AKS, and how do you pull images from Azure Container Registry?

**question_id:** `aks-ops-002`\
**topic_id:** `aks-ops`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical`

**Question**

How do pods authenticate to Azure services in AKS, and how do you pull images from Azure Container Registry?

**Answer**

Use **Microsoft Entra Workload Identity**: the cluster's OIDC issuer federates a Kubernetes service account with a user-assigned managed identity, so a pod gets Entra tokens without secrets (older pod identity is deprecated). Grant that identity RBAC roles on Key Vault, Storage or SQL. For images, attach ACR to the cluster (`az aks update --attach-acr`) which gives the kubelet identity the `AcrPull` role, so no image-pull secrets are needed. Keep the cluster identity separate from workload identities and use least-privilege roles.

Real-world example: Workload Identity wiring for a pod that reads Key Vault.

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: orders-sa
  annotations:
    azure.workload.identity/client-id: 11111111-2222-3333-4444-555555555555   # user-assigned managed identity
---
apiVersion: apps/v1
kind: Deployment
metadata: { name: orders }
spec:
  template:
    metadata:
      labels: { azure.workload.identity/use: "true", app: orders }
    spec:
      serviceAccountName: orders-sa
      containers: [{ name: api, image: myacr.azurecr.io/orders:1.2 }]
```

**Keywords:** `workload identity, managed identity, OIDC issuer, service account, ACR, AcrPull`

**Follow-ups:**

-   What does the federated credential trust?
-   Why avoid storing client secrets in pods?
-   How do you scan images in ACR?

## aks-ops-003 --- How do you expose and secure an application in AKS: ingress controllers, TLS and secrets?

**question_id:** `aks-ops-003`\
**topic_id:** `aks-ops`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical`

**Question**

How do you expose and secure an application in AKS: ingress controllers, TLS and secrets?

**Answer**

Expose Services of type ClusterIP and route external traffic through an **Ingress controller** (NGINX, or the managed Application Gateway for Containers / app routing add-on) that terminates TLS and routes by host and path. Automate certificates with cert-manager and Let's Encrypt, or Key Vault certificates. Secrets: Kubernetes Secrets are only base64, so use the **Secrets Store CSI driver** with the Azure Key Vault provider to mount secrets from Key Vault (using workload identity) and enable encryption at rest. Add network policies, private cluster API server and WAF in front for defense in depth.

Real-world example: an Ingress that terminates TLS and a SecretProviderClass that mounts a Key Vault secret.

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: shop
  annotations: { cert-manager.io/cluster-issuer: letsencrypt }
spec:
  ingressClassName: nginx
  tls: [{ hosts: [shop.example.com], secretName: shop-tls }]
  rules:
    - host: shop.example.com
      http: { paths: [{ path: /, pathType: Prefix, backend: { service: { name: shop, port: { number: 80 } } } }] }
---
apiVersion: secrets-store.csi.x-k8s.io/v1
kind: SecretProviderClass
metadata: { name: kv-secrets }
spec:
  provider: azure
  parameters: { usePodIdentity: "false", clientID: "<workload-identity-client-id>", keyvaultName: kv-shop, tenantId: "<tenant>",
    objects: "array:\n  - objectName: sql-password\n    objectType: secret" }
```

**Keywords:** `ingress, NGINX, TLS, cert-manager, Secrets Store CSI driver, Key Vault, network policy`

**Follow-ups:**

-   Ingress versus Service type LoadBalancer?
-   How do secrets rotate in pods?
-   How do network policies restrict pod traffic?

## aks-ops-004 --- What deployment strategies and monitoring do you use for production AKS releases?

**question_id:** `aks-ops-004`\
**topic_id:** `aks-ops`\
**difficulty:** `Senior / Lead`\
**question_type:** `Scenario`

**Question**

What deployment strategies and monitoring do you use for production AKS releases?

**Answer**

Use rolling updates with readiness probes and `maxUnavailable: 0` for zero downtime, blue/green through two Deployments and a Service selector switch, or canary through ingress weights or a mesh/Argo Rollouts, gated on metrics. Deliver with GitOps (Flux/Argo CD) so Git is the source of truth. For monitoring enable **Container Insights** or managed Prometheus and Grafana, collect logs to Log Analytics, alert on pod restarts, OOMKilled, pending pods, node pressure and HPA saturation, and trace requests with OpenTelemetry. Roll back with `kubectl rollout undo` or a Git revert.

Real-world example: a zero-downtime rolling update strategy with probes.

```yaml
spec:
  replicas: 4
  strategy:
    type: RollingUpdate
    rollingUpdate: { maxSurge: 1, maxUnavailable: 0 }
  template:
    spec:
      containers:
        - name: api
          image: myacr.azurecr.io/shop-api:2.3.1
          readinessProbe: { httpGet: { path: /health/ready, port: 8080 }, periodSeconds: 5 }
          livenessProbe:  { httpGet: { path: /health/live,  port: 8080 }, periodSeconds: 10 }
# rollback: kubectl rollout undo deployment/shop-api
```

**Keywords:** `rolling update, canary, blue/green, GitOps, Container Insights, Prometheus, rollback`

**Follow-ups:**

-   How do you automate canary analysis?
-   What do you alert on first?
-   How do you upgrade AKS safely?

# TOPIC --- Kubernetes Workload Objects: ReplicaSet, StatefulSet, ConfigMap and Job/CronJob
**topic_id:** `k8s-objects`
**priority:** `Core`

## k8s-objects-001 --- What is a ReplicaSet and how does it relate to a Deployment?

**question_id:** `k8s-objects-001`\
**topic_id:** `k8s-objects`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical`

**Question**

What is a ReplicaSet and how does it relate to a Deployment?

**Answer**

A **ReplicaSet** keeps a specified number of identical pods running, recreating pods that fail, using a label selector. You rarely create one directly: a **Deployment** manages ReplicaSets and adds declarative rollouts. On an image change the Deployment creates a new ReplicaSet and gradually scales it up while scaling the old one down, keeping old ReplicaSets (per `revisionHistoryLimit`) for rollback via `kubectl rollout undo`. A selector that overlaps another controller's pods causes fights, so keep labels unique.

Real-world example: how a Deployment owns ReplicaSets and how to inspect and roll back.

```bash
kubectl get deploy,rs -l app=shop-api          # one Deployment, several ReplicaSets (old + new)
kubectl rollout status deployment/shop-api
kubectl rollout history deployment/shop-api
kubectl rollout undo deployment/shop-api --to-revision=3
```

**Keywords:** `ReplicaSet, Deployment, selector, rollout, revisionHistoryLimit, rollback`

**Follow-ups:**

-   What does maxSurge do?
-   How do you roll back a bad release?
-   What happens if you delete a pod owned by a ReplicaSet?

## k8s-objects-002 --- When do you use a StatefulSet instead of a Deployment?

**question_id:** `k8s-objects-002`\
**topic_id:** `k8s-objects`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical`

**Question**

When do you use a StatefulSet instead of a Deployment?

**Answer**

Use a **StatefulSet** for workloads needing stable identity and storage: pods get ordered, predictable names (`db-0`, `db-1`), a stable network identity via a headless Service, and per-pod **PersistentVolumeClaims** (`volumeClaimTemplates`) that survive rescheduling. Pods start and stop in order and are updated one at a time. Typical fits: databases, Kafka, ZooKeeper, Elasticsearch. Prefer managed services (Azure SQL, Cosmos DB) over running databases yourself, because StatefulSets give identity, not data replication or backup. Plan storage classes, backups and zone-aware volumes.

Real-world example: a StatefulSet with a headless Service and per-pod storage.

```yaml
apiVersion: v1
kind: Service
metadata: { name: kafka }
spec: { clusterIP: None, selector: { app: kafka }, ports: [{ port: 9092 }] }   # headless: kafka-0.kafka, kafka-1.kafka
---
apiVersion: apps/v1
kind: StatefulSet
metadata: { name: kafka }
spec:
  serviceName: kafka
  replicas: 3
  selector: { matchLabels: { app: kafka } }
  template:
    metadata: { labels: { app: kafka } }
    spec: { containers: [{ name: kafka, image: bitnami/kafka:3.7, volumeMounts: [{ name: data, mountPath: /bitnami }] }] }
  volumeClaimTemplates:
    - metadata: { name: data }
      spec: { accessModes: [ReadWriteOnce], resources: { requests: { storage: 50Gi } } }
```

**Keywords:** `StatefulSet, headless service, PersistentVolumeClaim, volumeClaimTemplates, ordered startup`

**Follow-ups:**

-   What is a headless Service?
-   What happens to the PVC when a pod is deleted?
-   Why not run SQL Server in a StatefulSet?

## k8s-objects-003 --- How do ConfigMaps and Secrets inject configuration into a .NET container?

**question_id:** `k8s-objects-003`\
**topic_id:** `k8s-objects`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical`

**Question**

How do ConfigMaps and Secrets inject configuration into a .NET container?

**Answer**

A **ConfigMap** holds non-sensitive key-values or files; a **Secret** holds sensitive values (base64-encoded, optionally encrypted at rest, ideally sourced from Key Vault). Inject them as environment variables or mounted volumes. ASP.NET Core reads env vars with `__` as the hierarchy separator, so `ConnectionStrings__Default` maps to `ConnectionStrings:Default`. Environment variables do not update in running pods, while mounted files do refresh and can be reloaded with `reloadOnChange`. Keep per-environment values in the manifest overlay (Kustomize/Helm), and roll pods (checksum annotation) when config changes.

Real-world example: injecting a Secret and a ConfigMap value as environment variables.

```yaml
env:
  - name: ConnectionStrings__Default
    valueFrom:
      secretKeyRef: { name: app-secrets, key: sql }
  - name: Features__NewCheckout
    valueFrom:
      configMapKeyRef: { name: app-config, key: newCheckout }
```

**Keywords:** `ConfigMap, Secret, environment variables, volume mount, configuration, Kustomize`

**Follow-ups:**

-   How do you reload config without a restart?
-   Why are Secrets not truly secret?
-   How does Helm handle per-environment values?

## k8s-objects-004 --- How do Kubernetes Jobs and CronJobs work, and what pitfalls should you plan for?

**question_id:** `k8s-objects-004`\
**topic_id:** `k8s-objects`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical`

**Question**

How do Kubernetes Jobs and CronJobs work, and what pitfalls should you plan for?

**Answer**

A **Job** runs pods to completion with `completions`, `parallelism`, `backoffLimit` retries and `activeDeadlineSeconds`; use `restartPolicy: OnFailure` or `Never`. A **CronJob** creates Jobs on a cron schedule (UTC unless `timeZone` is set). Pitfalls: overlapping runs (set `concurrencyPolicy: Forbid` or `Replace`), missed schedules (`startingDeadlineSeconds`), non-idempotent work being retried, and finished Jobs piling up (`ttlSecondsAfterFinished`, history limits). Make jobs idempotent, log to stdout and alert on failed Jobs. For heavy workflows or complex scheduling consider a queue worker or Argo Workflows.

Real-world example: a nightly CronJob that cannot overlap, retries twice and cleans up.

```yaml
apiVersion: batch/v1
kind: CronJob
metadata: { name: nightly-report }
spec:
  schedule: "0 2 * * *"
  timeZone: Etc/UTC
  concurrencyPolicy: Forbid
  startingDeadlineSeconds: 600
  successfulJobsHistoryLimit: 3
  jobTemplate:
    spec:
      backoffLimit: 2
      ttlSecondsAfterFinished: 86400
      template:
        spec:
          restartPolicy: OnFailure
          containers: [{ name: report, image: myacr.azurecr.io/report-job:1.0 }]
```

**Keywords:** `Job, CronJob, concurrencyPolicy, backoffLimit, idempotent, ttlSecondsAfterFinished`

**Follow-ups:**

-   How do you prevent overlapping runs?
-   What happens after a node failure mid-job?
-   CronJob versus a background service in the API?
