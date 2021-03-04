const shelljs = require("shelljs");
const requestPromise = require("request-promise-native");
var fs = require("fs");
var exec = require('shelljs.exec')
const cmdLineArgs = require("command-line-args");
const jsonfile = require('jsonfile')

let opts: {
    username: string,
    password: string,
    choice: string,
    checkout_branch: string,
    new_branch: string,
};

async function ImageID(file: string, branch: string, repo: string, workspace: string){
    jsonfile.readFile(file, function (err, obj) {
        if (err) console.error(err)
        obj['Resources']['EcsInstanceLc']['Properties']['ImageId']='ami-03bf40f5e9f9e58e3';
        jsonfile.writeFile(file, obj,{ spaces: 2, EOL: '\r\n' }, function (err) {
          if (err){
              console.error(err)
              throw err;
            }else{
                console.log("Edited")
                var git_checkout_new_branch = exec('cd '+repo+' && git checkout -b'+ branch).stdout;
                console.log(git_checkout_new_branch); 
                var add = exec('cd '+repo+' && git add .').stdout;
                console.log(add);
                var commit = exec('cd '+repo+' && git commit -m "Initial commit"').stdout;
                console.log(commit); 
                var push = exec('cd '+repo+' && git push  git@bitbucket.org:'+workspace+'/'+repo+'.git '+branch).stdout;
                console.log(push);                 
            } 
        })
      })
      var pwd = exec('pwd', {silent:true}).stdout;
      console.log(pwd);
}

//Check service-stack file 
async function service_stack_criteria(workspace: string, repo: string, branch: string){
    try{
        //step1 check git availability 
        var git = exec('git --version', {silent:true}).stdout;
        console.log(git);
        //step2 clone repo
        var url = exec('git clone --single-branch --branch '+branch+' git@bitbucket.org:'+workspace+'/'+repo+'.git').stdout;
        console.log(url);
        //step3 check service-stack file exit or not
        if (fs.existsSync("./"+repo+"/deploy/service-stack.json")) {
            // Do something
            console.log("service-stack file exist");
            //step4 update ami value
            var list=exec('pwd && ls -l').stdout;
            console.log(list)
            //Jenkins Job name:- aws-cloudformation-confg
            const file = "/var/lib/jenkins/workspace/aws-cloudformation-confg/"+repo+"/deploy/service-stack.json"
            await ImageID(file,opts.new_branch,repo,workspace);
            
            //step5 delete repo
            //var del = exec('rm -rf '+repo).stdout;
            //console.log(del);
            return true;
        }else{
            console.log("not exist");
            //step5 delete repo
            var del = exec('rm -rf '+repo).stdout;
            console.log(del);
            return false;       
        }
    } catch (err) {
        console.log(err);
        throw err;
    }
} 

//Getting repo list
async function getReposList(owner: string, num: number) {

    let url = "https://api.bitbucket.org/2.0/repositories/" + owner + "/?pagelen=100&page=" + num + "&fields=next,values.name";
    let repos: any[] = [];
    try {
        while (url !== undefined) {
            console.log("getting repo list from:", url)
            const response = await requestPromise(url, {auth: {user: opts.username, pass: opts.password}});
            const parsedResponse = JSON.parse(response);
            repos = repos.concat(parsedResponse.values);
            url = parsedResponse.next;
        }
        return repos;
    } catch (err) {
        throw err;
    }

}

async function start(){
    let workspace: Array<string> = [opts.choice];
    // loop for workspace
    for (var repo_index in workspace){
        console.log("GETTING ALL REPOS FROM WORKSPACE "+" "+workspace[repo_index]);
        var page_index:number = 1;
        // loop for  pages
        while (true){
            const repo_data = await getReposList(workspace[repo_index],page_index)
            // Geeting all repos
            if (repo_data.length == 0){
                console.log("Fetched all repository");
                break;
            }
            //loop for repos
            for (let index = 0; index < repo_data.length; index++) {
                const repo = repo_data[index];
                console.log("Repository "+repo.name);
                await service_stack_criteria(workspace[repo_index],repo.name,opts.checkout_branch);
            }
            console.log(page_index);
            page_index++;
        }
    }
}


async function testDependencies() {
    const optionDefinitions = [
        {name: "username", alias: "u", type: String},
        {name: "password", alias: "p", type: String},
        {name: "choice", alias: "w", type: String},
        {name: "checkout_branch", alias: "c", type: String},
        {name: "new_branch", alias: "n", type: String},

    ];
    opts = cmdLineArgs(optionDefinitions);
    console.log(opts.username,opts.password,opts.checkout_branch,opts.new_branch);
    await start();
}

testDependencies().
catch((err) => {
    console.log(err);
});