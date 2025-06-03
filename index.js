const core = require("@actions/core");

let portainerUrl = core.getInput("portainerUrl");
const accessToken = core.getInput("accessToken");
const stackName = core.getInput("stackName");
const useAuthentication = core.getInput("useAuthentication");

let client;

if (portainerUrl.includes("http:")) {
  client = require("http");
} else {
  client = require("https");

  if (!portainerUrl.includes("https:")) {
    portainerUrl = `https://${portainerUrl}`;
  }
}

if (portainerUrl.substring(portainerUrl.length - 1) === "/") {
  portainerUrl = portainerUrl.substring(0, portainerUrl.length - 1);
}

core.setSecret(portainerUrl);
core.setSecret(accessToken);

let stackId = 0;
let endpoint = 0;

const getStackId = (callback) => {
  const url = `${portainerUrl}/api/stacks`;
  let data = "";

  console.log(`Getting stack id for stack: ${stackName}`);

  const req = client.request(
    url,
    {
      method: "GET",
      headers: {
        "X-API-Key": accessToken,
      },
    },
    (res) => {
      if (res.statusCode !== 200) {
        callback(false);
        core.setFailed("HTTP " + res.statusCode + " - " + res.statusMessage);
        process.exit(2);
      }

      res.on("data", (chunk) => {
        data += chunk;
      });

      res
        .on("end", () => {

          const jsonData = JSON.parse(data);

          if (Array.isArray(jsonData)) {

            for (i in jsonData) {
              const stack = jsonData[i];

              if (stack.Name === stackName) {
                console.log(
                  `Identified stackId: ${stack.Id} and endpoint: ${stack.EndpointId}`
                );

                stackId = stack.Id;
                endpoint = stack.EndpointId;

                callback(true);
              }
            }
          }
        })
        .on("error", (error) => {
          callback(false);
          core.setFailed("Error - " + error.message);
          process.exit(3);
        });
    }
  );

  req.end();
};

const doRedeploy = (attempt = 1) => {
  let data = "";

  const postData = JSON.stringify({
    pullImage: true,
    RepositoryAuthentication: useAuthentication,
    RepositoryPassword: "",
    RepositoryReferenceName: "",
    RepositoryUsername: "",
    env: [],
    prune: true,
  });

  const url = `${portainerUrl}/api/stacks/${stackId}/git/redeploy?endpointId=${endpoint}`;

  console.log("Hitting URL", url);
  console.log("With data:", postData);

  const req = client.request(
    url,
    {
      method: "PUT",
      headers: {
        "X-API-Key": accessToken,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData),
      },
    },
    (res) => {
      if (res.statusCode !== 200 && res.statusCode !== 500) {
        core.setFailed("HTTP " + res.statusCode + " - " + res.statusMessage);
        process.exit(2);
      }

      res.on("data", (chunk) => {
        data += chunk;
      });

      res
        .on("end", () => {
          if (res.statusCode == 500) {
            console.log(`Attempt #${attempt} failed.`);

            if (attempt < 3) {
              console.log("Retrying!");

              attempt++;

              setTimeout(() => {
                console.log("Retrying now");
                doRedeploy(attempt);
              }, 5000);

              return;
            } else {
              console.log("Reached max attempts!");
              core.setFailed("Error - Retried and retried and couldnt succeed");
              process.exit(3);
            }
          }

          const jsonData = JSON.parse(data);

          if (jsonData.Name) {
            console.log(`Successfully redeployed ${jsonData.Name}!`);
          }
        })
        .on("error", (error) => {
          core.setFailed("Error - " + error.message);
          process.exit(3);
        });
    }
  );

  req.write(postData);
  req.end();
};

getStackId((success) => {
  if (success) {
    doRedeploy();
  } else {
    console.log("Failed to get stack id and endpoint");
  }
});
