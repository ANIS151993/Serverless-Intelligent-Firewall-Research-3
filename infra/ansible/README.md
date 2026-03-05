# ASLF-OSINT Ansible Deployment

This Ansible package deploys the Research-3 control API to two Proxmox nodes:

- super control plane (`aslf_role=super`)
- tenant edge plane (`aslf_role=tenant`)

## Structure

- `inventory/prod.yml`: target hosts
- `group_vars/all.yml`: deployment defaults
- `playbooks/site.yml`: full provisioning + service rollout
- `templates/`: systemd/env/runtime templates

## Prerequisites

Run from a workstation or admin node with Ansible:

```bash
python3 -m pip install --user "ansible>=9.0.0"
```

## Configure

1. Edit inventory:

```bash
cp inventory/prod.yml inventory/prod.local.yml
```

2. Update `inventory/prod.local.yml` with your SSH connection details.
3. Update `group_vars/all.yml` values or provide overrides with `-e`.

Important:
- Set `aslf_jwt_secrets` (recommended) or `aslf_jwt_secret`.
- Set a non-default super admin password hash.

## Deploy

```bash
cd infra/ansible
ansible-playbook -i inventory/prod.local.yml playbooks/site.yml
```

## Verify

The playbook runs a local health check on each node.

Manual checks:

```bash
ssh root@172.16.185.182 "systemctl status aslf-super --no-pager"
ssh root@172.16.184.111 "systemctl status aslf-tenant --no-pager"
```

