const fs = require('fs')
const process = require('process')
const path = require('path')
const child_process = require('child_process');

var inquirer = require('inquirer');
const glob = require("glob")

//Environment variables:
const appdata = process.env.appdata


/* -------------------------------------------------------------------------- */
/*                                  FUNCTIONS                                 */
/* -------------------------------------------------------------------------- */

function getRevitVersions() {
    //find installed revit verions from the registry
    return new Promise((resolve, reject) => {

        //get installed programs
        var installedPrograms = child_process.spawnSync('reg', ['query HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall'], { shell: true }).output.toString().split("\r\n")
        var revitversions = []

        //find revit
        for (let i = 0; i < installedPrograms.length; i++) {
            const pr = installedPrograms[i].split("\\")
            const prname = pr[pr.length - 1]
            const prarr = prname.split(" ")

            // find version numbers
            if (prarr[0] == "Revit" && prarr.length == 2) {
                revitversions.push(prarr[1])
            }
        }
        resolve(revitversions);
    })
}

function findAddinFiles(version) {
    //find addin files and print nice list
    //calls selectoptions


    var addinpath = []
    var addinFiles = []

    //create addin folder's paths
    addinpath[0] = path.join(appdata, '\\Autodesk\\Revit\\Addins', version)
    addinpath[1] = path.join('C:\\ProgramData\\Autodesk\\Revit\\Addins', version)
    addinpath[2] = path.join('C:\\Program Files\\Autodesk\\', 'Revit' + version, 'AddIns')

    //find addin files not in ApplicationPlugins
    for (let i = 0; i < addinpath.length; i++) {
        const element = addinpath[i];
        var f = glob.sync(element + '/*.addin*')
        addinFiles = addinFiles.concat(f)
    }

    // find version specific addins in ApplicationPlugins
    var addinRoot = 'C:\\ProgramData\\Autodesk\\ApplicationPlugins\\'
    var g = glob.sync(addinRoot + '/**/' + version + '/**/*.addin*')
    addinFiles = addinFiles.concat(g)

    //find not version specific plugins in ApplicationPlugins
    var h = glob.sync(addinRoot + '/**/!(20)??/*.addin*')
    addinFiles = addinFiles.concat(h)

    //create lists
    var addinList = [] //all data, it will be converted to objects after sort
    var addinNames = [] //only names, used for finding longest only
    for (let i = 0; i < addinFiles.length; i++) {
        var pathArray = addinFiles[i].split("/")
        var fileName = pathArray[pathArray.length - 1]
        var addinName = fileName.split(".addin")
        var addinStatus
        if (addinName[1] == ".disabled") {
            addinStatus = "disabled"
        } else {
            addinStatus = "enabled"
        }
        var line = addinName[0] + "|" + addinStatus + "|" + addinFiles[i]
        addinList.push(line)
        addinNames.push(addinName[0])
    }

    //sort addins
    addinList.sort()
    addinNames.sort()

    //find longest addin name
    var longestline = 1
    for (let i = 0; i < addinNames.length; i++) {
        const element = addinNames[i];
        if (addinNames[i].length > longestline) {
            longestline = addinNames[i].length
        }
    }

    var addinObjects = []
    var addinTable = []

    //rebuild lists and objects sorted
    for (let i = 0; i < addinList.length; i++) {
        var currarr = addinList[i].split("|")

        var obj = {
            name: currarr[0],
            status: currarr[1],
            path: currarr[2]
        }
        addinObjects.push(obj)
        var cname = {
            name: addinNames[i].padEnd(longestline + 2) + currarr[1],
            value: i
        }
        addinTable.push(cname)
    }

    selectoption(version, addinTable, addinObjects)
}


function selectoption(version, tabl, data) {
    //version: selected revit version
    //table: formatted names statuses and numbers
    //data: all data
    var pluschoices = [
        new inquirer.Separator(),
        { name: 'Enable all', value: 'enabled' },
        { name: 'Disable all', value: 'disabled' },
        { name: 'Exit', value: 'exit' },
        new inquirer.Separator()
    ]
    tabl = pluschoices.concat(tabl)
    inquirer.prompt([
        {
            type: 'list',
            name: 'addin',
            message: 'Select addin to disable',
            choices: tabl
        }
    ])
        .then(answers => {
            // console.log(answers.addin)
            switch (answers.addin) {
                case 'exit':
                    console.log()
                    console.log('Thanks for using this program!')
                    console.log('Please restart Revit if it\'s running')
                    setTimeout(_=>{
                        return
                    },5000)
                    break;

                case 'enabled':
                case 'disabled':
                    for (let i = 0; i < data.length; i++) {
                        var last = false
                        if (i + 1 == data.length) {
                            last = true
                        }
                        chAddin(version, i, data, answers.addin, last)
                    }
                    break;

                default:
                    chAddin(version, answers.addin, data, false, false)
                    break;
            }
        })
}

function chAddin(version, addinnr, fullobj, forcedStatus, last) {
    //change to disabled or enabled
    //version: revitversion
    //addinnr: number of addin in the list
    //fullobj: all addins as objects
    //forcedStatus: "enabled"|"disabled"|false: force for enable/disable all
    //last: boolean: last element in enable/disable all
    var currObj = fullobj[addinnr]
    var np
    var targetStatus

    if ((currObj.status == "enabled" && !forcedStatus) || (currObj.status == "enabled" && forcedStatus == "disabled")) {
        np = currObj.path + ".disabled"
        targetStatus = "Disabled"
    } else if ((currObj.status == "disabled" && !forcedStatus) || (currObj.status == "disabled" && forcedStatus == "enabled")) {
        np = currObj.path.replace('.disabled', '')
        targetStatus = "Enabled"
    } else if (last) {
        findAddinFiles(version)
    } else {
        return
    }

    var oldPath = path.join(currObj.path)
    var newPath = path.join(np)

    fs.rename(oldPath, newPath, (err) => {
        if (err) throw err;
        console.log()
        console.log(targetStatus, currObj.name)
        if (!forcedStatus || last) {
            console.log()
            findAddinFiles(version)
        }

    })
}

/* -------------------------------------------------------------------------- */
/*                                START PROMPTS                               */
/* -------------------------------------------------------------------------- */

getRevitVersions()
    .then(rv => {
        console.log()
        console.log("In case of an error try running this program as Administrator!")
        console.log("Restart Revit after running this program! Or close it now.")
        console.log()
        //ask for revit version
        return inquirer.prompt([
            {
                type: 'list',
                name: 'version',
                message: 'Revit version:',
                choices: rv
            }
        ])

    })
    .then(answers => {
        findAddinFiles(answers.version)
    })