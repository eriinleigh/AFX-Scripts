
//////////////////////////////////////////////
/////////////// AUTO COMPOSITOR ////////////// 
////////// Moondog Animation Studio //////////
/////// Created by: Aurelien Kochalski ///////
////////// Adapted by: Erin Terre ////////////
//////////////////////////////////////////////

// NOTE : In AfterFX, check the option in Edit > Preferences > General > Allow Scripts to write files and access Network. 
// NOTE : In AfterFX, load the Render presets and Output Modules presets specifically created for this script. (.aom and .ars files in lib folder)

// TODO : Making several renders in one operation instead of opening and closing the comps each time.

// BUG : If the globalfps in ConfigGeneral.xml is set differently than the fps in the Master Comp an error will be displayed.

#include "..\\lib\\FunctionsLibrary.jsxinc"

// Global variables Declaration (no keyword "var")
pathToConfigXml = "W:\\DEV\\PIPELINE\\AFXSCRIPTS\\ConfigGeneral.xml";

// Loading the global configuration
config = LoadConfig(pathToConfigXml);

// get share drive && projectname from Config xml
sharedDrive = config["paths_sharedDrive"];
projectName = config["projects_project"];

// get path to project based compositing task xml
// (ex. W:\ID\07_COMPOSITING\CompositingTasks.xml)
pathToCompositingTasksXml = sharedDrive+"\\"+projectName+"\\07_COMPOSITING\\CompositingTasks.xml"


// get Render Presets, Output Module Names, globalfps
renderPresetHalfRes = config["afterFx_renderPresetHalfRes"];
renderPresetFullRes = config["afterFx_renderPresetFullRes"];

outputModuleHalfRes = config["afterFx_outputModuleHalfRes"]; 
outputModuleFullResSequence = config["afterFx_outputModuleFullResSequence"];
outputModuleFullRes = config["afterFx_outputModuleFullRes"]; 

globalFps = parseInt(config["afterFx_globalfps"]);

// Main program Execution
ExecuteAutomaticCompositingTasks();	

//////////////////////////////////////////////////////////////////
/////////////// ExecuteAutomaticCompositingTasks() ///////////////
////// ARUGMENTS: (0) ////////////////////////////////////////////
////// RETURNS: (0) //////////////////////////////////////////////
////// INFO: runs through the xml in order to execute all tasks //
////// ERROR HANDLER: returns false if missing xml ///////////////
//////////////////////////////////////////////////////////////////

function ExecuteAutomaticCompositingTasks()
{
	// continue ONLY if the loading of the xml has been done successfully
	if(xmlList = LoadXML(pathToCompositingTasksXml))
	{
		// Read through the sub nodes compositingTask
		for (var i=0; i<xmlList.elements().length(); i++)
		{
			// Getting the variables of the compositingTask
			var project = xmlList.compositingTask[i].project.@value;
			var episode = xmlList.compositingTask[i].episode.@value;
			var sequence = xmlList.compositingTask[i].sequence.@value;
			var shot = xmlList.compositingTask[i].shot.@value;
			var frames = xmlList.compositingTask[i].frames.@value;
			var renderType = xmlList.compositingTask[i].renderType.@value;
			var masterComp = xmlList.compositingTask[i].masterComp.@value;
			var renderVersion = xmlList.compositingTask[i].renderVersion.@value;
			var username = "auto.aep";

			// Get episode name from episode
			var episodeName = episode.split('_')
			var episodeName = episodeName[1]
			
			// Defining the default increment (at the end, the 00 files will be ones created by script errors)
			var outputCompositingFileIncrementationalNumber = "00";

			// Getting the list of compositings for this shot
			var compositingsList = GetCompositingsList(project, episode, sequence, shot);
	
			// Looking for an exisiting compositing file for the shot
			// Create one starting at 01 if there isnt one
			if(compositingsList.length==0)
			{
				outputCompositingFileIncrementationalNumber = "01";
			}
			else
			{
				// get the last file in list, split its name by underscore && get increment
				var lastFile = compositingsList[compositingsList.length-1]; 
				var splittedFileName = lastFile.split('_'); 
				var lastFileIncrementationalNumber = splittedFileName[4].replace("v", ""); 
				outputCompositingFileIncrementationalNumber = zeropad( parseInt(lastFileIncrementationalNumber,10)+1 ).toString();
			}

			// set all paths needed

			// Path to compositing
			// (ex. W:\ID\07_COMPOSITING)
			var compPath = config["paths_sharedDrive"]+"\\"+project+"\\07_COMPOSITING";

			// Path to prod
			// (ex. W:\ID\05_PROD)
			var prodPath = config["paths_sharedDrive"]+"\\"+project+"\\05_PROD";

			// Path to the AfterFX master composition
			// (ex. W:\ID\07_COMPOSITING\AFX_GENERAL\ID_Master_Comp.aep)
			var pathToMasterCompositionProject = compPath+"\\AFX_GENERAL\\"+masterComp;

			// Path to the renders
			// (ex. W:\ID\05_PROD\EPISODES\EP###_NAME\04_RENDER\sq###_sh####)
			var pathToRenders =  prodPath+"\\EPISODES\\"+episode+"\\04_RENDER\\"+sequence+"_"+shot;

			// run function to check if there are multiple versions in the render folder
			var pathToImages = CheckForRenderVersions(pathToRenders);

			// Path to the compositing folder
			// (ex. W:\ID\05_PROD\EPISODES\EP###_NAME\05_COMPOSITING\AFX\)
			var pathToOutputCompositingFile =  prodPath+"\\EPISODES\\"+episode+"\\05_COMPOSITING\\AFX\\";
			
			// Path to Renders
			// (ex. W:\ID\05_PROD\EPISODES\EP###_NAME\05_COMPOSITNG\FINAL_IMAGES\)
			var pathToOutputImageFile =  prodPath+"\\EPISODES\\"+episode+"\\05_COMPOSITING\\FINAL_IMAGES\\";

			// Path to MOV Files
			// (ex. W:\ID\05_PROD\EPISODES\EP###_NAME\05_COMPOSITING\FINAL_IMAGES\sq###_sh####\v##\)
			var pathToMOV = pathToOutputImageFile+sequence+"_"+shot+"\\"+"v"+outputCompositingFileIncrementationalNumber+"\\";

			// Path to PNG Full Res
			// (ex. W:\ID\05_PROD\EPISODES\EP##_NAME\05_COMPOSITING\FINAL_IMAGES\sq###_sh####\v##\PNG\)
			var pathToOutputRenderFolderFullResSequence = pathToOutputImageFile+sequence+"_"+shot+"\\"+"v"+outputCompositingFileIncrementationalNumber+"\\PNG\\";

			// Path to PNG 3 Frame
			// (ex. W:\ID\05_PROD\EPISODES\EP##_NAME\05_COMPOSITING\FINAL_IMAGES\sq###_sh####\v##\PNG_3frame\)
			var pathToOutputPreviewSequence = pathToOutputImageFile+sequence+"_"+shot+"\\"+"v"+outputCompositingFileIncrementationalNumber+"\\PNG_3frame\\";

			// First half of file names
			// (ex. epname_sq###_sh####)
			fileName = episodeName.toLowerCase()+"_"+sequence.toLowerCase()+"_"+shot.toLowerCase();

			// Compositing File Name
			// (ex. epname_sq###_sh####_AFX_v##_auto.aep)
			var outputCompositingFileName = fileName+"_AFX_v"+outputCompositingFileIncrementationalNumber+"_"+username;
		
			// Half Res MOV File Name
			// (ex. epname_sq###_sh####_peview_v##.mov)
			var outputRenderHalfResFileName = fileName+"_preview_v"+outputCompositingFileIncrementationalNumber+".mov";

			// PNG Half Res File Name
			// (ex. epname_sq###_sh####_preview_v##_####.png)
			var outputRenderHalfResSequenceFileName = fileName+"_preview_v"+outputCompositingFileIncrementationalNumber+"_[####].png"; 

			// PNG Full Res File Name
			// (ex. epname_sq###_sh####_fullres_v##_####.png)
			var outputRenderFullResSequenceFileName = fileName+"_fullres_v"+outputCompositingFileIncrementationalNumber+"_[####].png"; 

			// MOV Full Res File Name
			// (ex. epname_sq###_sh####_fullres_v##.mov)
			var outputRenderFullResFileName = fileName+"_fullres_v"+outputCompositingFileIncrementationalNumber+".mov";

			// Generate the compositing file
			TaskGenerateCompositingFile(
					pathToMasterCompositionProject, 
					frames,
					pathToImages, 
					pathToOutputCompositingFile, 
					outputCompositingFileName
			);
			
			// asking for preview renders
			if(renderType=="preview")
			{
				// Generating the Preview - MOV
				TaskGenerateCompositingRender(
					pathToOutputCompositingFile+outputCompositingFileName,
					renderPresetHalfRes, 
					outputModuleHalfRes, 
					pathToMOV,
					outputRenderHalfResFileName,
					frames,
					"false"
				);

				// Generating the Preview - PNG
				TaskGenerateCompositingRender(
					pathToOutputCompositingFile+outputCompositingFileName,
					renderPresetFullRes, 
					outputModuleFullResSequence, 
					pathToOutputPreviewSequence,
					outputRenderHalfResSequenceFileName,
					frames,
					"true"
				);
			}
			
			// asking for final renders
			if(renderType=="final")
			{
				// Generating the Full Res - MOV
				TaskGenerateCompositingRender(
					pathToOutputCompositingFile+outputCompositingFileName,
					renderPresetFullRes, 
					outputModuleFullRes, 
					pathToMOV,
					outputRenderFullResFileName,
					frames,
					"false"
				);

				// Generating the Full Res - PNG
				TaskGenerateCompositingRender(
					pathToOutputCompositingFile+outputCompositingFileName,
					renderPresetFullRes, 
					outputModuleFullResSequence,
					pathToOutputRenderFolderFullResSequence,
					outputRenderFullResSequenceFileName,
					frames,
					"false"
				);
			}
		}
	}
	// The xml file has not been loaded successfully, display error and quit script
	else
    {
        alert("Error : the file : '"+pathToCompositingTasksXml+"' can't be loaded.");
		return false;
    }
}

//////////////////////////////////////////////////////////////////
//////////////////// CheckForRenderVersions() ////////////////////
////// ARUGMENTS: (1) ////////////////////////////////////////////
////// RETURNS: (1) pathToImages /////////////////////////////////
////// INFO: checks to see if shot has versions of renders ///////
//////////////////////////////////////////////////////////////////

function CheckForRenderVersions(pathToRenders){

	// get folder where renders are
	var renderFolder = new Folder(pathToRenders);
	var pathToImages = pathToRenders;

	// continue ONLY if the render folder exists
	if(renderFolder.exists)
	{	
		// get files in the folder && sort them
		var folderContent = renderFolder.getFiles();
		folderContent = folderContent.sort();

		// get the name of the last folder
		var numFolders = folderContent.length;
		lastFolder = folderContent[numFolders - 1].name;

		// check if the last folder is a version folder && add the folder name to the path
		// NOTE : WE ARE CHECKING TO SEE IF THE RENDER FOLDER CONTAINS MULTIPLE VERSIONS
		if(/v?\d{2}/.test(lastFolder)){
			pathToImages = pathToRenders + "\\" + lastFolder;
		}

		return pathToImages;
	}
	else
	{
        alert("Error : the file : '"+pathToRenders+"' doesn't exists.");
		return false;
	}
}

//////////////////////////////////////////////////////////////////
//////////////////// CheckForRenderVersions() ////////////////////
////// ARUGMENTS: (5) ////////////////////////////////////////////
////// RETURNS: (0)  /////////////////////////////////////////////
////// INFO: create && save compositing file based on MasterComp /
//////////////////////////////////////////////////////////////////

function TaskGenerateCompositingFile(pathToMasterCompositionProject, compositionFrames, pathToImages, pathToOutputCompositingFile, outputCompositingFileName)
{
	// open master comp, get its objects && create progress bar
	var oProject = OpenProject(pathToMasterCompositionProject);
	var oItems = oProject.items; 
	var oProgressBar = ProgressBarCreate("Automatic compositing");

	// first run through of all project elements to reload the footages
	for (var i=1; i<=oItems.length; i++)
	{
		// Getting all footages from the "Media" folder and reloading all image sequences
		if (oProject.item(i).name == "Media" && (oProject.item(i).typeName == "Folder" ||  oProject.item(i).typeName == "Dossier"))
		{	
			ProgressBarSetText(oProgressBar, "Reloading Image Sequences");
			ProgressBarSetMaxValue(oProgressBar, oProject.item(i).numItems);
				
			// for each element in Media Folder, get footage && load the image sequence
			for (var j=1; j<=oProject.item(i).numItems; j++ )
			{
				var oFootage = app.project.item(i).item(j);
				ReloadFootage(oFootage, pathToImages);
				ProgressBarSetCurrentValue(oProgressBar, j);	
			}
		}	
	}
	
	// second run through of all project elements to scale compositions and layers
	// NOTE : we have to run through the elements 2 times so we can reload all the footages first, then re-time all the comps. you cannot scale the comps before loading footage
	for (var i=1; i<=oItems.length; i++) // we run through all the project's elements one second time in order to scale the compositions and the layers.
	{
		// Getting all the comps that need to be retimed
		if ((oProject.item(i).name == "PreComps" || oProject.item(i).name == "Comps_FINAL") && (oProject.item(i).typeName == "Folder" ||  oProject.item(i).typeName == "Dossier"))
		{
			ProgressBarSetText(oProgressBar, "Updating Timings");
			ProgressBarSetMaxValue(oProgressBar, oProject.item(i).numItems);
			
			// for each element in Comps_FINAL. get the comp && redefine its length
			for (var j=1; j<=oProject.item(i).numItems; j++)
			{
				var oCompo = app.project.item(i).item(j);
				UpdateCompositionTime(oCompo, 0, compositionFrames);
				ProgressBarSetCurrentValue(oProgressBar, j);
			}	
		}		
	}
	
	ProgressBarClose(oProgressBar);
	
	// saving the compositing projet in the AFX folder corresponding's folder 
	// NOTE : if the file already exists, it will be overwritten
	var outputCompositingFile = new File(pathToOutputCompositingFile+outputCompositingFileName);
	oProject.save(outputCompositingFile);
}

//////////////////////////////////////////////////////////////////
///////////////// TaskGenerateCompositingRender() ////////////////
////// ARUGMENTS: (7) ////////////////////////////////////////////
////// RETURNS: (0)  /////////////////////////////////////////////
////// INFO: load compositing project && send a render ///////////
////// ERROR HANDLER: returns false if file does not exist ///////
//////////////////////////////////////////////////////////////////

function TaskGenerateCompositingRender(pathToCompositingFile, presetRenderSettings, presetOutputModule, pathToOutputRender, outputRenderFileName, frames, renderPreviewSequence)
{
	var compositingFile = new File(pathToCompositingFile);
	
	// continue ONLY if the compositing file exists
	if(compositingFile.exists)
	{		
		// if asked for preview PNGs
		if(renderPreviewSequence=="true")
		{
			// Convert frames to int. Divide by 2, get middleFrame, create array of frames
			frames = parseInt(frames);
			middleFrame = Math.round(frames/2);
			framesToRender = [1, middleFrame, frames, 0]

			// for each frame value
			for(var i=0; i<=3; i++)
			{
				// open project && empty render queue
				var oProject = OpenProject(pathToCompositingFile)
				CleanRenderQueue(oProject);

				// get the FINAL composition in Comps_FINAL
				for (var h=1; h<=app.project.items.length; h++) 
				{
	    			if (app.project.item(h).name == "Comps_FINAL") 
	    			{
	    				for (var j=1; j<=oProject.item(h).numItems; j++)
						{
							if(app.project.item(h).item(j).name == "FINAL")
							{
								var oComposition = app.project.item(h).item(j);
							}
					 	}
	   				 }
				}

				// if we are rendering frame 1
				if (i == 0)
				{
					// set composition duration to one frame
					oComposition.duration = currentFormatToTime(1, globalFps, false);

					// Start time should already be set

					// Render
					CreateRenderQueueItem(oProject, presetRenderSettings, presetOutputModule, pathToOutputRender, outputRenderFileName);
					RenderPreview(oProject);
				}

				// if we are rendering middle frame or last frame
				else if (i > 0 && i < 3)
				{
					// set composition duration to one frame
					oComposition.duration = currentFormatToTime(1, globalFps, false);

					// set composition start frame to the frame in the array
					// (ex. Frame is 49 :: start frame is set to 49)
					oComposition.displayStartTime = currentFormatToTime(framesToRender[i], globalFps, true);

					// adjust each layer in the composition to (negative frame value + 1) so the layers still start at frame 1
					// (ex. Start Frame is 49 :: Layer start is set to -48)
					for(var g=1; g<=oComposition.numLayers; g++)
					{
						oComposition.layer(g).startTime = currentFormatToTime((-framesToRender[i]) + 1, globalFps, false);
					}

					// Render
					CreateRenderQueueItem(oProject, presetRenderSettings, presetOutputModule, pathToOutputRender, outputRenderFileName);
					RenderPreview(oProject);
				}

				// if we are done rendering, reset everything
				else 
				{
					// set composition duration to the full frame length
					oComposition.duration = currentFormatToTime(frames, globalFps, true);

					// set composition start frame back to 0
					oComposition.displayStartTime = currentFormatToTime(0, globalFps, true);

					// adjust each layer in the composition back to frame 1
					for(var g=1; g<=oComposition.numLayers; g++)
					{
						oComposition.layer(g).startTime = currentFormatToTime(0, globalFps, true);
					}
				}

				// save the project
				oProject.save(compositingFile);
			}
		}

		// running all other render requests
		else
		{
			// open the project, empty render queue, create render task, send to render, save project
			var oProject = OpenProject(pathToCompositingFile) 
			CleanRenderQueue(oProject); 
			CreateRenderQueueItem(oProject, presetRenderSettings, presetOutputModule, pathToOutputRender, outputRenderFileName); 
			RenderPreview(oProject); 
			oProject.save(compositingFile);
		}
	}

	// The compositing file does not exist, display error and quit script
	else
    {
        alert("Error : the file : '"+pathToCompositingFile+"' doesn't exists.");
		return false;
    }
}

//////////////////////////////////////////////////////////////////
///////////////////////// ReloadFootage() ////////////////////////
////// ARUGMENTS: (2) ////////////////////////////////////////////
////// RETURNS: (0)  /////////////////////////////////////////////
////// INFO: replace footage images with new ones ////////////////
////// ERROR HANDLER: returns false if file does not exist ///////
//////                returns false if folder doesnt have images /
//////				  returns false if folder does not exist /////
//////                returns false if footage file doesnt exist /
//////////////////////////////////////////////////////////////////

function ReloadFootage(oFootage, pathToImages)
{
	// continue ONLY if there is a footage file
	if(oFootage.file)
	{	
		// get path to footage and split path by folders
		var refFootageFilePathSplitted = oFootage.file.path.split("/"); 

		// getting the last folder of the footage, which corresponds to the pass (ex Color, or INK, or PERSOmatte)
		var refFootagePassFolder = refFootageFilePathSplitted[refFootageFilePathSplitted.length-1];

		// and we merge it to the path to the new .pic (so now we have a path that points to another shot of the same pass)
		var folderPath = pathToImages+"\\"+refFootagePassFolder;

		// open folder
		var folder = new Folder(folderPath);
		
		// continue ONLY if the folder exists
		if(folder.exists)
		{
			// create path to the files for the path && load them
			var fileToLoadPath = folderPath+"\\"+oFootage.file.name;
			var fileToLoad = new File(fileToLoadPath);
			
			// continue ONLY if the file exists
			if(fileToLoad.exists)
			{
				// get all the files in the folder with an extension
				var folderContent = folder.getFiles("*.*");

				// if there's more than one image, we use the "replaceWithSequence" method
				if(folderContent.length > 1)
				{
					oFootage.replaceWithSequence(fileToLoad, false);
				}

				// if there's only one image, we use the "replace" method
				else if(folderContent.length == 1)
				{
					oFootage.replace(fileToLoad); 
				}

				// no files in folder, display error and quit script
				else
				{
					alert("Error : there are no files in the folder");
					return false;					
				}
			}

			// file does not exist, display error and quit script
			else
			{
				alert("Error : the file : '"+fileToLoadPath+"' doesn't exists.");
				return false;
			}
		}

		// folder does not exist, display error and quit script
		else
		{
			alert("Error : the folder : '"+folderPath+"' doesn't exists.");
			return false;
		}
	}

	// footage file does not exist, display error and quit script
	else
	{
		alert("Error : the property 'file' doesn't exists for this footage.");
		return false;
	}
}

//////////////////////////////////////////////////////////////////
/////////////////// UpdateCompositionTime() //////////////////////
////// ARUGMENTS: (3) ////////////////////////////////////////////
////// RETURNS: (0)  /////////////////////////////////////////////
////// INFO: redefine composition and layers timing //////////////
//////////////////////////////////////////////////////////////////

function UpdateCompositionTime(oComposition, frameIn, frameOut)
{

	// redefine begining frame, composition length, work area
	oComposition.workAreaStart = parseInt(frameIn);
	oComposition.duration = currentFormatToTime(parseInt(frameOut), globalFps, false);
	oComposition.workAreaDuration = currentFormatToTime(parseInt(frameOut), globalFps, false);
	
	// redefine start and end frame of each layer in the composition
	for(var i=1; i<=oComposition.numLayers; i++)
	{
		oComposition.layer(i).startTime = parseInt(frameIn);
		oComposition.layer(i).outPoint = currentFormatToTime(parseInt(frameOut), globalFps, false);
	}

}

//////////////////////////////////////////////////////////////////
////////////////////// CleanRenderQueue() ////////////////////////
////// ARUGMENTS: (1) ////////////////////////////////////////////
////// RETURNS: (0)  /////////////////////////////////////////////
////// INFO: empty the render queue //////////////////////////////
//////////////////////////////////////////////////////////////////

function CleanRenderQueue(oProject)
{
	// get render queue for the project
	var oRenderQueue = oProject.renderQueue;

	// as long as there are elements in the render queue, delete them
	// NOTE : parsing the list from the end because we delete items in the array.
	for (var i=oRenderQueue.numItems; i>=1; i--)
	{
		oRenderQueue.item(i).remove();
	}
}

//////////////////////////////////////////////////////////////////
///////////////////// CreateRenderQueueItem() ////////////////////
////// ARUGMENTS: (5) ////////////////////////////////////////////
////// RETURNS: (1) renderQueueItem  /////////////////////////////
////// INFO: create item in render queue /////////////////////////
//////////////////////////////////////////////////////////////////

function CreateRenderQueueItem(oProject, presetRenderSettings, presetOutputModule, pathToOutputRender, outputRenderFileName)
{
	// get render queue for project && create object to store the render queue element
	var oRenderQueue = oProject.renderQueue;
	var renderQueueItem = null;
	
	// parse all elementents of the project looking for the FINAL composition
	for (var i=1; i<=oProject.numItems; i++)
	{
		if (oProject.item(i).name == "FINAL")
		{	
			// adding the comp atr the end of the render queue
			renderQueueItem = oRenderQueue.items.add(oProject.item(i));

			// set render preset, output module, destination
			renderQueueItem.applyTemplate(presetRenderSettings); 
			renderQueueItem.outputModule(1).applyTemplate(presetOutputModule); 
			renderQueueItem.outputModule(1).file = new File(pathToOutputRender+outputRenderFileName);
						
			// verify if the destination folder exists
			var outputFolder = new Folder (pathToOutputRender);

			// create folder if it doesn't exist
			if(!outputFolder.exist)
			{
				outputFolder.create();
			}
		}
	}

	// return the created element
	return renderQueueItem;
}

//////////////////////////////////////////////////////////////////
///////////////////////// RenderPreview() ////////////////////////
////// ARUGMENTS: (1) ////////////////////////////////////////////
////// RETURNS: (0)  /////////////////////////////////////////////
////// INFO: triggers rendering of elements in render queue //////
////// ERROR HANDLER: returns false if render got an exception ///
//////                returns false if no elements in queue //////
//////////////////////////////////////////////////////////////////

function RenderPreview(oProject)
{
	// get render queue && number of elements in render queue
	var oRenderQueue = oProject.renderQueue;
	var oRenderQueueItems = oRenderQueue.numItems;

	// continue ONLY if there are elements to render
	if(oRenderQueueItems != 0)
	{
		// for each element in render queue, create item && trigger the render
		for (var i=1; i<=oRenderQueueItems; i++)
		{
			var currentRenderQueueItem = oRenderQueue.item(i);
			currentRenderQueueItem.render = true;
		}
		
		// we try/catch the render as it can get exceptions
		try
		{
			// trigger the rendering
			oRenderQueue.render();
		}

		// The render encountered an exception, display error and quit script
		catch(e)
		{
			alert("Error : the render triggered the following error : "+e.toString()+".");
			return false;
		}
	}

	// no elements in render queue, display error and quit script
	else
	{
		alert("Error : the render queue is empty.");
		return false;
	}

}