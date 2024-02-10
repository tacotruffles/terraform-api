# OUTPUT: FOR WWW OR OTHER SERVICES THAT NEED TO SEE
output "api_base_url" {
  value = aws_apigatewayv2_stage.api_stage.invoke_url
}

# FROM: Networking State File
output "whitelist_ip" {
  value = data.terraform_remote_state.networking.outputs.whitelist_ip
}

output "mongodb_uri" {
  # value = local.env["MONGODB_URI"]
  value = local.env["MONGODB_HOST"]
  # sensitive = true
}
