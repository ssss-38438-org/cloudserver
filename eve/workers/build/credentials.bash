#!/bin/bash -x
set -x #echo on
set -e #exit at the first error

mkdir -p ~/.aws
cat >>/root/.aws/exports <<EOF
export AWS_ACCESS_KEY_ID=
export AWS_SECRET_ACCESS_KEY=
export GOOGLE_SERVICE_EMAIL="$GCP_BACKEND_SERVICE_EMAIL"
export GOOGLE_SERVICE_KEY="$GCP_BACKEND_SERVICE_KEY"
export azurebackend2_AZURE_STORAGE_ACCESS_KEY="Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw=="
export azurebackend2_AZURE_STORAGE_ACCOUNT_NAME="devstoreaccount1"
export azurebackend2_AZURE_STORAGE_ENDPOINT="http://127.0.0.1:10000/devstoreaccount1"
export azurebackend_AZURE_STORAGE_ACCESS_KEY="Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw=="
export azurebackend_AZURE_STORAGE_ACCOUNT_NAME="devstoreaccount1"
export azurebackend_AZURE_STORAGE_ENDPOINT="http://127.0.0.1:10000/devstoreaccount1"
export azurebackendmismatch_AZURE_STORAGE_ACCESS_KEY="Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw=="
export azurebackendmismatch_AZURE_STORAGE_ACCOUNT_NAME="devstoreaccount1"
export azurebackendmismatch_AZURE_STORAGE_ENDPOINT="http://127.0.0.1:10000/devstoreaccount1"
export azurenonexistcontainer_AZURE_STORAGE_ACCESS_KEY="Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw=="
export azurenonexistcontainer_AZURE_STORAGE_ACCOUNT_NAME="devstoreaccount1"
export azurenonexistcontainer_AZURE_STORAGE_ENDPOINT="http://127.0.0.1:10000/devstoreaccount1"
export azuretest_AZURE_BLOB_ENDPOINT="http://127.0.0.1:10000/devstoreaccount1"
EOF

source /root/.aws/exports &> /dev/null
cat >>/root/.aws/credentials <<EOF
[default]
aws_access_key_id = $AWS_S3_BACKEND_ACCESS_KEY
aws_secret_access_key = $AWS_S3_BACKEND_SECRET_KEY
[default_2]
aws_access_key_id = $AWS_S3_BACKEND_ACCESS_KEY_2
aws_secret_access_key = $AWS_S3_BACKEND_SECRET_KEY_2
[google]
aws_access_key_id = $AWS_GCP_BACKEND_ACCESS_KEY
aws_secret_access_key = $AWS_GCP_BACKEND_SECRET_KEY
[google_2]
aws_access_key_id = $AWS_GCP_BACKEND_ACCESS_KEY_2
aws_secret_access_key = $AWS_GCP_BACKEND_SECRET_KEY_2
EOF

