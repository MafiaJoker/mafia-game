# deployments/

Kustomize-манифесты для деплоя web SPA в Vultr VKE кластер.

## Структура

- `base/` — `Deployment`, `Service`, `Ingress`, `kustomization.yaml` с общими лейблами.
- `overlays/dev/` — namespace `mafia-helper-dev`, host `dev.jokermafia.am`,
  cluster-issuer `letsencrypt-staging`, 1 реплика.
- `overlays/prod/` — namespace `mafia-helper-prod`, host `app.jokermafia.am`,
  cluster-issuer `letsencrypt-prod`, 2 реплики.

## CI/CD

Деплой автоматический через `.github/workflows/deploy.yml`:

- `push` в `master` → dev (`https://dev.jokermafia.am`)
- `release published` → prod (`https://app.jokermafia.am`)

CI собирает Docker image с `VITE_*` build-args, пушит в `puppeyregistry.vultrcr.com`,
делает `kustomize edit set image` + `kubectl apply -k`, ждёт rollout.

## Один раз перед первым деплоем

В отличие от backend, у web нет ни `Secret`, ни `ConfigMap` — всё запекается
в Docker image на build-time через `VITE_*` build-args. `imagePullSecret vultr-registry`
уже создан в обоих namespace скриптом `deploy-cluster.sh` (см.
`/home/puppey/code/config/infrastructure/vultr`).

Проверка:

```bash
kubectl -n mafia-helper-dev get secret vultr-registry
kubectl -n mafia-helper-prod get secret vultr-registry
```

### GitHub repo secrets

- `VULTR_REGISTRY_URL` = `ewr.vultrcr.com/puppeyregistry` (см. `REGISTRY_URN` в `secrets/registry-creds` infra-репозитория — формат `<region>.vultrcr.com/<name>`)
- `VULTR_REGISTRY_USERNAME` (из того же `secrets/registry-creds`)
- `VULTR_REGISTRY_PASSWORD` (там же)

### GitHub environment secrets

Settings → Environments → создать `development` и `production`, в каждом secret `KUBECONFIG`:

```bash
gh secret set KUBECONFIG --env development \
  -R <org>/mafia-game \
  < ~/code/config/infrastructure/vultr/secrets/kubeconfig-gh-mafia-helper-dev.yaml.b64
gh secret set KUBECONFIG --env production \
  -R <org>/mafia-game \
  < ~/code/config/infrastructure/vultr/secrets/kubeconfig-gh-mafia-helper-prod.yaml.b64
```

### DNS (Cloudflare)

A-записи `dev.jokermafia.am` и `app.jokermafia.am` → VKE_LB_IP. **Proxied = OFF**,
иначе cert-manager HTTP01 challenge не пройдёт.

LB IP:

```bash
kubectl -n ingress-nginx get svc ingress-nginx-controller \
  -o jsonpath='{.status.loadBalancer.ingress[0].ip}'
```

## Ручное применение (для отладки)

```bash
export KUBECONFIG=~/code/config/infrastructure/vultr/secrets/kubeconfig
kubectl apply -k deployments/overlays/dev
kubectl apply -k deployments/overlays/prod
```

Без `kustomize edit set image` Deployment упадёт в `ImagePullBackOff` — в base указано
bare-имя `mafia-helper-web`. Первый CI-прогон задеплоит реальный образ.

## Откат

```bash
kubectl -n <namespace> rollout undo deployment/web
kubectl -n <namespace> rollout status deployment/web
```

State'а нет (statless static serve) — откат безопасный.

## TLS

Dev использует `letsencrypt-staging` (untrusted в браузерах — при первом открытии
`dev.jokermafia.am` принять предупреждение о self-signed сертификате). Это сделано,
чтобы не расходовать prod rate-limit Let's Encrypt на тестовый домен.

## Изменить VITE_* переменную

Все `VITE_*` запекаются в bundle на этапе `docker build`. Чтобы поменять значение:

1. Поправить build-args в `.github/workflows/deploy.yml` (job `build`, шаг
   `docker/build-push-action`).
2. Если переменная новая — добавить `ARG`/`ENV` в `Dockerfile`.
