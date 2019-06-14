# revitAddinDisabler

Enable or disable Revit addins by name or all of them

## installation and usage

- Download from [releases](https://github.com/infeeeee/revitAddinDisabler/releases/latest)
- Just doubleclick the downloaded exe, it should ask for admin rights if UAC enabled.  
- If it doesn't ask for it, close and rightclick -> run as admin
- Follow the prompts in the console, select exit to exit

## installation details

### prerequisites

- Windows, because Revit is Windows only
- Windows account with admin rights. Some of the Revit plugins are installed in %programdata% and in %programfiles% and you need admin rights to write there
- Autodesk Revit, it should work with any version

### developement version installation

#### Prerequisites: 

- git
- node js 10+
- pkg for building

```
git clone https://github.com/infeeeee/revitAddinDisabler
cd revitAddinDisabler
npm install
npm start
```

#### build 

```
npm install -g pkg
npm run build
```

## troubleshhoting

- Make sure you run it as admin!!
- Open an issue if something not working

## license

MIT