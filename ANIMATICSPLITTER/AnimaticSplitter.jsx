
//////////////////////////////////////////////
////////////// ANIMATIC SPLITTER /////////////
////////// Moondog Animation Studio //////////
/////////// Created by: Erin Terre ///////////
//////////////////////////////////////////////

// NOTE : In AfterFX, check the option in Edit > Preferences > General > Allow Scripts to write files and access Network. 
// NOTE : In AfterFX, load the Render presets and Output Modules presets specifically created for this script. (.aom and .ars files in lib folder)

// TODO : Making several renders in one operation instead of opening and closing the comps each time.

// BUG : NONE AS OF 6/16/2016

#include "..\\lib\\FunctionsLibrary.jsxinc"

// Global variables Declaration (no keyword "var")
pathToConfigXml = "W:\\DEV\\PIPELINE\\AFXSCRIPTS\\ConfigGeneral.xml";

// Loading the global configuration
config = LoadConfig(pathToConfigXml);

// get share drive && projectname from Config xml
sharedDrive = config["paths_sharedDrive"];
projectName = config["projects_project"];
episode = config["projects_episode"];
animaticName = config["projects_animatic"];

// Get episode name from episode
episodeName = episode.split('_');
episodeName = episodeName[1].toLowerCase();

// get path to episode based animatic folder
// (ex. W:\PROJECTNAME\05_PROD\EPISODES\EP003_TEST\02_ANIMATIC\epName_ATK_v##.xml)
animaticFolder = sharedDrive + "\\" + projectName + "\\05_PROD\\EPISODES\\" + episode + "\\02_ANIMATIC\\";

// get paths to animatic XML and MOV
animaticXML = animaticFolder + episodeName + "_cutdata.xml";
animaticMOV = animaticFolder + animaticName;


// get Render Presets, Output Module Names, globalfps
renderPresetFullRes = config["afterFx_renderPresetFullRes"];
outputModuleFullRes = config["afterFx_outputModuleFullRes"]; 
globalFps = parseInt(config["afterFx_globalfps"]);

// run the main function
main();

//////////////////////////////////////////////////////////////////
////////////////////////////// main() ////////////////////////////
////// ARUGMENTS: (0) ////////////////////////////////////////////
////// RETURNS: (0) //////////////////////////////////////////////
////// INFO: runs through the xml in order to execute all tasks //
////// ERROR HANDLER: returns false if missing xml ///////////////
//////////////////////////////////////////////////////////////////

function main(){

	// get version from our animatics name
	var version = animaticName.split('_');
	version = version[version.length - 1];
	version = version.split('.');
	version = version[0];

	var animaticAFX = animaticFolder + episodeName + "_ATK_" + version + ".aep";

	// set path to output folder
	// (ex. W:\PROJECTNAME\05_PROD\EPISODES\EP003_TEST\02_ANIMATIC\v##\)
	var outputFolderPath = animaticFolder + version + "\\";

	// check that outputFolder exisits && otherwise create it
	var outputFolder = new Folder(outputFolderPath);

	if(!outputFolder.exists){
		outputFolder.create();
	}

	// continue ONLY if the loading of the xml has been done successfully
	if(xmlList = LoadXML(animaticXML)){

		// get the episodes duration
		var episodeDuration = (xmlList.@duration);

		// create the compositing file from the full animatic
		animaticComp = setupProject(animaticMOV, animaticAFX, episodeDuration);

		// get all shots from the xml
		var shots = xmlList.elements().elements();

		// Read through the episodes sub nodes
		for (var i=0; i < shots.length(); i++){

			// get the shot information from xml
			var shotName = shots[i].@name;
			var start = shots[i].@framein;
			var end = shots[i].@frameout;
			var shotDuration = shots[i].@duration;
			var sequenceName = shots[i].@attachedto;

			// set the output file name
			var outputFileName = episodeName+"_"+sequenceName+"_"+shotName+"_ATK_"+version+".mov";

			// set output file path
			var outputFilePath = outputFolderPath + outputFileName;

			// check if the output file path already exists
			var filePath = new File(outputFilePath);
			if(filePath.exists){
				outputFileName = episodeName+"_"+sequenceName+"_"+shotName+"_ATK_"+version+"_recut.mov";
				outputFilePath = outputFolderPath + outputFileName;
			}

			renderAnimatic(animaticComp, outputFilePath, start, end, shotDuration); 
		}
	}
	else{

        alert("Error : the file : '"+animaticXML+"' can't be loaded.");
		return false;
	}
}

//////////////////////////////////////////////////////////////////
//////////////////////// setupProject() //////////////////////////
////// ARUGMENTS: (3) ////////////////////////////////////////////
////// RETURNS: (1) animaticComp /////////////////////////////////
////// INFO: creates the AFX file, comp && imports animatic //////
////// ERROR HANDLER: returns false if missing animatic //////////
//////////////////////////////////////////////////////////////////

function setupProject(animaticMOV, animaticAFX, episodeDuration){

	// Create a new project
	var oProject = app.newProject();

	// Create the file for animaticMOV
	var mov = new File(animaticMOV);

	// return false if the animatic does not exist
	if(!mov.exists){
		alert("Error : the file : '"+animaticMOV+"' can't be found.");
		return false;
	}

	// Import file
	oProject.importFile(new ImportOptions(mov));

	// select the file in the project
	var selection = oProject.selection;

	// create composition
	var oComposition = oProject.items.addComp('Animatic', 1920, 1080, 1, 60, globalFps);

	// add file to the composition
	oComposition.layers.add(selection[0]);

	// set the composition settings //
	updateCompositionTime(oComposition, 0, episodeDuration);

	// set animatic comp file and save project
	var animaticComp = new File(animaticAFX);
	oProject.save(animaticComp);

	return animaticComp;
}

//////////////////////////////////////////////////////////////////
/////////////////////// renderAnimatic() /////////////////////////
////// ARUGMENTS: (5) ////////////////////////////////////////////
////// RETURNS: (0) //////////////////////////////////////////////
////// INFO: renders a clip of the animatic //////////////////////
//////////////////////////////////////////////////////////////////

function renderAnimatic(pathToComp, outputFilePath, start, end, shotDuration){

	// open project 
	var oProject = app.open(pathToComp);

	// get composition
	for (var i = 1; i <= app.project.items.length; i++) {
		if (app.project.item(i).name == "Animatic"){
			var oComposition = app.project.item(i);
		}
	}

	// empty render queue, create new render item, render && save project 
	cleanRenderQueue(oProject);
	createRenderQueueItem(oProject, oComposition, outputFilePath, start, shotDuration);
	renderPreview(oProject);
	oProject.save(pathToComp);
}

//////////////////////////////////////////////////////////////////
////////////////////// cleanRenderQueue() ////////////////////////
////// ARUGMENTS: (1) ////////////////////////////////////////////
////// RETURNS: (0)  /////////////////////////////////////////////
////// INFO: empty the render queue //////////////////////////////
//////////////////////////////////////////////////////////////////

function cleanRenderQueue(oProject){

	// get render queue for the project
	var oRenderQueue = oProject.renderQueue;

	// as long as there are elements in the render queue, delete them
	// NOTE : parsing the list from the end because we delete items in the array.
	for (var i=oRenderQueue.numItems; i>=1; i--){
		oRenderQueue.item(i).remove();
	}
}

//////////////////////////////////////////////////////////////////
///////////////////// createRenderQueueItem() ////////////////////
////// ARUGMENTS: (5) ////////////////////////////////////////////
////// RETURNS: (1) renderQueueItem  /////////////////////////////
////// INFO: create item in render queue /////////////////////////
//////////////////////////////////////////////////////////////////

function createRenderQueueItem(oProject, oComposition, outputFilePath, start, shotDuration){

	// get render queue for project && create object to store the render queue element
	var oRenderQueue = oProject.renderQueue;
	var renderQueueItem = null;

	// add the composition to the end of the render queue
	renderQueueItem = oRenderQueue.items.add(oComposition);

	// set render settings, output module, output to
	renderQueueItem.applyTemplate(renderPresetFullRes);
	renderQueueItem.outputModule(1).applyTemplate(outputModuleFullRes);
	renderQueueItem.outputModule(1).file = new File(outputFilePath);

	// set render start time and duration
	renderQueueItem.timeSpanDuration = currentFormatToTime(shotDuration, globalFps, false);
	renderQueueItem.timeSpanStart = currentFormatToTime(start, globalFps, false);

	return renderQueueItem;
}

//////////////////////////////////////////////////////////////////
/////////////////// updateCompositionTime() //////////////////////
////// ARUGMENTS: (3) ////////////////////////////////////////////
////// RETURNS: (0)  /////////////////////////////////////////////
////// INFO: redefine composition and layers timing //////////////
//////////////////////////////////////////////////////////////////

function updateCompositionTime(oComposition, frameIn, frameOut){
	
	// redefine begining frame, composition length, work area
	oComposition.workAreaStart = parseInt(frameIn);
	oComposition.duration = currentFormatToTime(parseInt(frameOut), globalFps, false);
	oComposition.workAreaDuration = currentFormatToTime(parseInt(frameOut), globalFps, false);

	//set the start and end point of the layer
	oComposition.layer(1).startTime = parseInt(frameIn);
	oComposition.layer(1).outPoint = currentFormatToTime(parseInt(frameOut), globalFps, false);
}

//////////////////////////////////////////////////////////////////
///////////////////////// renderPreview() ////////////////////////
////// ARUGMENTS: (1) ////////////////////////////////////////////
////// RETURNS: (0)  /////////////////////////////////////////////
////// INFO: triggers rendering of elements in render queue //////
////// ERROR HANDLER: returns false if render got an exception ///
//////                returns false if no elements in queue //////
//////////////////////////////////////////////////////////////////

function renderPreview(oProject){
	// get render queue && number of elements in render queue
	var oRenderQueue = oProject.renderQueue;
	var oRenderQueueItems = oRenderQueue.numItems;

	// continue ONLY if there are elements to render
	if(oRenderQueueItems != 0){
		// for each element in render queue, create item && trigger the render
		for (var i=1; i<=oRenderQueueItems; i++){
			var currentRenderQueueItem = oRenderQueue.item(i);
			currentRenderQueueItem.render = true;
		}
		
		// we try/catch the render as it can get exceptions
		try{
			// trigger the rendering
			oRenderQueue.render();
		}

		// The render encountered an exception, display error and quit script
		catch(e){
			alert("Error : the render triggered the following error : "+e.toString()+".");
			return false;
		}
	}

	// no elements in render queue, display error and quit script
	else{
		alert("Error : the render queue is empty.");
		return false;
	}
}