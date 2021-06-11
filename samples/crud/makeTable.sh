#
#   Create "TestCrud" DynamoDB table
#

#   NOTE: this is not used. The sample creates its own database table
#
aws dynamodb create-table \
   --table-name TestCrud \
   --endpoint-url http://localhost:8000 \
   --attribute-definitions \
        AttributeName=pk,AttributeType=S AttributeName=sk,AttributeType=S \
        AttributeName=gs1pk,AttributeType=S AttributeName=gs1sk,AttributeType=S \
   --key-schema KeyType=HASH,AttributeName=pk KeyType=SORT,AttributeName=sk \
   --billing-mode PAY_PER_REQUEST \
   --global-secondary-indexes \
        'IndexName=gs1,KeySchema=[{KeyType="HASH",AttributeName="gs1pk"},{KeyType="SORT",AttributeName="gs1sk"}],Projection={ProjectionType="ALL"}' >/dev/null
