# Ingest API .env file as sensitve values to avoid flashing in logs, etc.
# GitHub Actions will generate .env from {{ $secrets.API_<STAGE>DOTENV }}
locals {
  # env = { for tuple in regexall("(.*?)=(.*)", file("${path.module}/../../api/.env")) : tuple[0] => sensitive(tuple[1]) }
  env = { for tuple in regexall("(.*?)=(.*)", file("${path.module}/../../api/.env")) : tuple[0] => tuple[1] if (tuple[0] != "AWS_ACCESS_KEY_ID" && tuple[0] != "AWS_SECRET_ACCESS_KEY" && tuple[0] != "AWS_REGION" && tuple[0] != "AWS_PROFILE")  } // tuple[0] != "S3_MEDIA_BUCKET" && 
}

# Generate project-based prefix string for user-friendly asset names
locals {
  name = {
    prefix = "${var.prefix}-${var.stage}"
  }
}

variable "stage" {
  description = "CI/CD pipeline stage"
  type = string
  default = "stage"
}

variable "prefix" {
  description = "Acronym for your project"
  type = string
}
variable "aws_region" {
  description = "AWS region for deployment"
  type = string
}

variable "aws_profile" {
  description = "AWS CLI Profile name"
  type = string
}

variable "tf_state_bucket" {
  description = "Terraform Backend: S3 bucket"
  type = string
}

variable "tf_state_key" {
  description = "Terraform Backend: S3 key"
  type = string
}

# TBD
# variable "tf_state_table" {
#   description = "Terraform Backend: S3 state table"
#   type = string
# }