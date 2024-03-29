const fs = require('fs')
const process = require('process')
const path = require('path')
const child_process = require('child_process');

var inquirer = require('inquirer');
const glob = require("glob")
const keypress = require('keypress');

//Environment variables:
const appdata = process.env.appdata

// debug logging
const util = require('util');
const debugapp = util.debuglog('debugapp');
const debugstart = util.debuglog('debugstart');


/* -------------------------------------------------------------------------- */
/*                                  FUNCTIONS                                 */
/* -------------------------------------------------------------------------- */

function getRevitVersions() {
    //find installed revit verions from the registry
    return new Promise((resolve, reject) => {

        //get installed programs
        var installedPrograms = child_process.spawnSync('reg', ['query HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall /s'], {
            shell: true
        }).output.toString().split("\r\n\r\n")
        var revitversions = []

        debugstart(installedPrograms)

        //find revit
        for (let i = 0; i < installedPrograms.length; i++) {
            const programRegistry = installedPrograms[i].split("\r\n")
            
            // debugapp('Checking program:', programRegistry[0])

            //find DisplayName
            for (let j = 0; j < programRegistry.length; j++) {
                const registryValue = programRegistry[j];
                if (registryValue.indexOf('DisplayName') > 0) {

                    //Find program
                    const programNameValue = registryValue.split('   ')
                    const programName = programNameValue[programNameValue.length - 1]
                    debugapp('program name:', programName)

                    // Check if it's Revit
                    const revitRegex = new RegExp('^ *Revit \\d{4}$');
                    debugapp(revitRegex.test(programName))
                    if (revitRegex.test(programName)) {
                        const programNameArray = programName.split(' ')
                        revitversions.push(programNameArray[programNameArray.length - 1])
                    }
                }
            }            
        }
        revitversions.sort()
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

    //find addin files in addinpaths
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

    //find addins in program files subfolders
    var programfilesAddins = 'C:\\Program Files\\Autodesk\\Revit ' + version + '\\AddIns\\'
    var i = glob.sync(programfilesAddins + '/**/*.addin*')
    addinFiles = addinFiles.concat(i)

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

/**
 * 
 * @param {String} version Revit verision
 * @param {Array} tabl formatted names statuses and numbers
 * @param {Array} data all data in an array of objects
 * @param {Boolean} pathvis path is visible
 */
function selectoption(version, tabl, data, pathvis = false) {
    var pluschoices = [
        new inquirer.Separator(),
        {
            name: 'Enable all',
            value: 'enabled'
        },
        {
            name: 'Disable all',
            value: 'disabled'
        },
        {
            name: 'Show/hide paths',
            value: 'showpath'
        },
        {
            name: 'Exit',
            value: 'exit'
        },
        new inquirer.Separator()
    ]
    let tablExt = pluschoices.concat(tabl)
    inquirer.prompt([{
            type: 'list',
            name: 'addin',
            message: 'Select addin to disable',
            pageSize: process.stdout.rows - 3,
            choices: tablExt
        }])
        .then(answers => {
            // console.log(answers.addin)
            switch (answers.addin) {
                case 'exit':
                    console.log()
                    console.log('Thanks for using this program!')
                    console.log('Please restart Revit if it\'s running')
                    console.log()
                    console.log('Press any key to exit!')


                    keypress(process.stdin)
                    process.stdin.on('keypress', _ => {
                        process.stdin.pause()
                    });

                    process.stdin.setRawMode(true);
                    process.stdin.resume();
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
                case 'showpath':
                    if (pathvis) {
                        for (let i = 0; i < tabl.length; i++) {
                            tabl[i].name = tabl[i].origname
                        }
                        selectoption(version, tabl, data, false)
                    } else {
                        for (let i = 0; i < tabl.length; i++) {
                            tabl[i].origname = tabl[i].name
                            tabl[i].name = tabl[i].name + "   " + data[i].path

                        }
                        selectoption(version, tabl, data, true)
                    }
                    break;

                default:
                    chAddin(version, answers.addin, data, false, false)
                    break;
            }
        })
}
/**
 * change addin to disabled or enabled
 * @param {string} version Revit version
 * @param {number} addinnr Number of addin in the list
 * @param {Array} fullobj All addins as objects
 * @param {*} forcedStatus "enabled"|"disabled"|false: force enable/disable all
 * @param {boolean} last Last element in enable/disable all
 */
function chAddin(version, addinnr, fullobj, forcedStatus, last) {

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
        console.log("=== revitAddinDisabler ===")
        console.log()
        console.log("In case of an error try running this program as Administrator!")
        console.log("Restart Revit after running this program! Or close it now.")
        console.log()
        //ask for revit version
        return inquirer.prompt([{
            type: 'list',
            name: 'version',
            message: 'Revit version:',
            choices: rv
        }])

    })
    .then(answers => {
        findAddinFiles(answers.version)
    })