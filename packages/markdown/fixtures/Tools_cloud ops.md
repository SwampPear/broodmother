# Cloud Training — Dodgson on Vertex AI

How to train the ECSEQ-1 basecaller (the `dodgson` model) on Google Cloud instead of a local machine.

The `cloud-ops` library packages the repo, ships it to a GPU-backed Vertex AI VM, and runs `train.py` there with the same flags you would use locally.

Use this when a local run is too slow (CPU, or Apple-Silicon MPS) and you want a real CUDA GPU.

For a single \~1–2 hour three-phase run, a single A100 is the sweet spot.

---

## Architecture

Two repos cooperate:

- **`dodgson/`** — the model, simulator, and `scripts/train.py`. Gains a `-cloud` flag that hands the run off to Google Cloud.
- **`cloud-ops/`** — the dispatch library (`cloudops` package). Packages a source tree, uploads it to GCS, and launches a Vertex AI `CustomTrainingJob`.

What happens on `train.py --cloud`:

1. `train.py` strips the `-cloud*` flags and forwards the rest.
2. `cloudops.launch_training` tars the `dodgson` repo and uploads it to the staging bucket.
3. A Vertex AI job starts on the chosen GPU preset, running `cloudops/remote/bootstrap.py` inside the container.
4. The bootstrap downloads the source (and optionally datasets) from GCS, `pip install`s the project, and execs `python scripts/train.py <forwarded args>`.
5. On the VM, the device auto-detects to CUDA.

---

## GPU presets

A preset bundles the GCE machine type, accelerator type, and accelerator count that Vertex requires together (it rejects mismatched pairings).

| Preset | Machine | Accelerator | When to use |
| --- | --- | --- | --- |
| `cpu` | n1-standard-8 | none | smoke tests / debugging |
| `t4` | n1-standard-8 | 1× T4 | cheapest GPU, tiny runs |
| `l4` | g2-standard-8 | 1× L4 | modest; the previous default |
| `a100` | a2-highgpu-1g | 1× A100 40GB | **default** — "pretty fast" |
| `a100x4` | a2-highgpu-4g | 4× A100 40GB | only faster if training is distributed |

`a100x4` only helps if the training loop is data-parallel. `train.py` is currently single-device, so for one run prefer `a100`. Adding DDP is the next lever for a bigger speedup.

---

## Prerequisites

1. A sibling `cloud-ops/` checkout next to `dodgson/`.
2. `cloud-ops/.env` with the GCP project and staging bucket:

	```
	project_id=<gcp-project>
	staging_bucket=gs://<staging-bucket>
	region=us-central1
	# optional: default_preset=a100
	# optional: container_image=us-docker.pkg.dev/vertex-ai/training/pytorch-gpu.2-4:latest
	```

3. Application-default credentials (one-time):

	```
	gcloud auth application-default login
	```

---

## Usage

From the `dodgson/` repo:

```bash
# Full three-phase run on one A100, generating data on the VM:
uv run python scripts/train.py --cloud --generate --plots

# Pick a GPU tier: cpu | t4 | l4 | a100 | a100x4
uv run python scripts/train.py --cloud --cloud-preset a100x4 --generate --phase 2 3

# Use pre-uploaded datasets in GCS instead of generating on the VM:
uv run python scripts/train.py --cloud --cloud-data gcs \
    --cloud-data-uri gs://<bucket>/datasets --phase 2 3 --plots

# Verify what would be dispatched, without uploading or launching:
uv run python scripts/train.py --cloud --cloud-dry-run --generate
```

Equivalently, drive it from `cloud-ops/`:

```bash
uv run python scripts/train_dodgson.py --preset a100 -- --generate --plots
uv run python scripts/list_jobs.py        # check job status
```

### Cloud-only flags (consumed locally; everything else is forwarded)

| Flag | Meaning |
| --- | --- |
| `--cloud` | Dispatch to Vertex AI instead of training locally. |
| `--cloud-preset` | GPU tier (`cpu`/`t4`/`l4`/`a100`/`a100x4`). Default `a100`. |
| `--cloud-data` | `generate` (build on VM) or `gcs` (download). Default `generate`. |
| `--cloud-data-uri` | `gs://` dataset bundle (`.tar.gz`) or prefix of `.npz`. Required for `gcs`. |
| `--cloud-job-name` | Vertex AI display name. Default `dodgson-train`. |
| `--cloud-sync` | Block until the job finishes. |
| `--cloud-dry-run` | Package + resolve, but do not upload or dispatch. |

---

## Data delivery

- **generate-on-VM** (default): `-generate` is added automatically; the simulator rebuilds datasets on the VM from seeds. No upload needed, reproducible, slightly more VM time.
- **GCS**: point `-cloud-data-uri` at a `gs://…/datasets.tar.gz` bundle or a `gs://` prefix of `.npz` files; the bootstrap downloads them into `data/` before training.

---

## Known limitations

- **Outputs stay on the VM.** `runs/` (figures) and `checkpoints/` are written inside the container and are not auto-retrieved yet. Pull them from the VM or point the entry script at GCS-mounted paths.
- **Single-device.** No distributed training yet, so `a100x4` is not worth it for one run.
- **First live run is the real test.** The library is validated locally (presets, packaging, arg-forwarding), but a real Vertex dispatch needs valid GCP credentials and quota for the chosen accelerator. Use `-cloud-dry-run` first.

---

*See also: **`cloud-ops/README.md`** and **`cloud-ops/docs/cloud-training.md`** (same content, lives with the code).*
