﻿///// CONFIGURATION
fl.outputPanel.clear(); // debug purposes
fl.showIdleMessage(false);

var symbols = [];
var meshExport = false; // If to use a spritemap or mesh vertex data
var BTA_version = "bta_1"; // easy to modify
var onlyVisibleLayers = true;
var optimiseDimensions = true; // TODO: doesnt work yet
var optimizeJson = true; // TODO: theres still some variable names left to change for optimized lmao
var flattenSkewing = false;
var resolution = 1.0;
var platform = fl.version.split(" ")[0];
var version = fl.version.split(" ")[1].split(",");
var ShpPad = 0;
var BrdPad = 0;
/////

var doc = fl.getDocumentDOM();
var lib = doc.library;

var instance = null;
var resScale = 1.0;

if (doc.selection.length > 0)
{
	var i = 0;
	while (i < doc.selection.length)
	{
		var object = doc.selection[i];
		if (object.elementType == "instance")
			symbols.push(object.libraryItem.name);
		i++;
	}
}
else if (lib.getSelectedItems().length > 0)
{
	var items = lib.getSelectedItems();
	while (items.length > 0)
		symbols.push(items.shift().name);
}

if (symbols.length > 0)
{
	var save = "";
	
	var res = 1.0;
	var optDimens = "true";
	var optAn = "true";
	var flatten = "false";
	
	if (FLfile.exists(fl.configURI + "Commands/saveBTA.txt"))
	{
		var file = FLfile.read(fl.configURI + "Commands/saveBTA.txt").split("\n");
		save = file[0];
		ShpPad = parseInt(file[1]);
		BrdPad = parseInt(file[2]);
		res = parseFloat(file[3]);
		optDimens = file[4];
		optAn = file[5];
		flatten = file[6];
	}
	
	var stuff = "";
	if (version[0] >= 13)
	{
		if (version[0] < 20)
			stuff = fl.getThemeColor("themeAppBackgroundColor");
		else
		{
			stuff = fl.getThemeColor("themeAppBackgroundColor");
			switch(stuff)
			{
					case "#404040": stuff = "#333333"; break;
					case "#262626": stuff = "#1f1f1f"; break;
					case "#B9B9B9": stuff = "#f5f5f5"; break;	
					case "#F2F2F2": stuff = "#ffffff"; break;
			}
		}
	}
	else {
		stuff = "#f0f0f0";
	}

	var config = fl.configURI;

	FLfile.write(config + "Commands/BTATheme.txt", stuff);
	
	var rawXML = FLfile.read(config + "Commands/BTADialog.xml");
	var fileuri = (save != "") ? save + "\\" + symbols[0] : fl.configDirectory + "\\Commands\\" + symbols[0];
	
	rawXML = rawXML.split("$CONFIGDIR").join(fl.configDirectory);
	rawXML = rawXML.split("$FILEURI").join(fileuri);
	rawXML = rawXML.split("$SHP").join(ShpPad);
	rawXML = rawXML.split("$BRD").join(BrdPad);
	rawXML = rawXML.split("$RES").join(res);
	rawXML = rawXML.split("$OPTDIM").join(optDimens);
	rawXML = rawXML.split("$OPTAN").join(optAn);
	rawXML = rawXML.split("$FLAT").join(flatten);
	
	var buttonWidth = 0;
	if (parseInt(version[0]) >= 20)
		buttonWidth = 50;
	
	rawXML = rawXML.split("$BWI").join(buttonWidth);
	
	var xPan = null;
	
	// Flash doesnt support direct panels from strings so we gotta create a temp xml
	if (parseInt(version[0]) < 15 && parseInt(version[1]) < 1)
	{
		var tempP = config + "Commands/_BTAD.xml";
		FLfile.write(tempP, rawXML, null);
		xPan = fl.xmlPanel(tempP);
		FLfile.remove(tempP);
	}
	else
	{
		xPan = fl.xmlPanelFromString(rawXML);
	}	
	
	if (xPan == null)
	{
		alert("Failed loading XML Panel");
	}
	else if (xPan.dismiss == "accept")
	{
		var familySymbol = [];
		var frs = [];
		var curFr = doc.getTimeline().currentFrame;
		var n = "";

		while (true)
		{
			n = doc.getTimeline().name;
			doc.exitEditMode();

			if (n == doc.timelines[0].name)
				break;

			if (doc.selection[0] != undefined)
			{
				familySymbol.unshift(doc.selection[0]);
				frs.unshift(doc.getTimeline().currentFrame);
			}
		}
		
		ShpPad = parseInt(xPan.ShpPad);
		BrdPad = parseInt(xPan.BrdPad);
		res = xPan.ResSld;
		optDimens = xPan.OptDimens;
		optAn = xPan.OptAn;
		flatten = xPan.FlatSke;
		fileuri = xPan.saveBox;
		
		optimiseDimensions = (optDimens == "true");
		optimizeJson = (optAn == "true");
		flattenSkewing = (flatten == "true");
		resolution = parseFloat(res);
		resScale =  1 / resolution;

		// First ask for the export folder
		var path = formatPath(fileuri);
	
		FLfile.createFolder(path);
		exportAtlas(path, symbols);

		var saveArray = fileuri.split("\\");
		saveArray.pop();
		var savePath = saveArray.join("\\");
		
		FLfile.write(fl.configURI + "Commands/saveBTA.txt", savePath + "\n" + ShpPad + "\n" + BrdPad +  "\n" + res +  "\n" + optDimens +  "\n" + optAn +  "\n" + flatten);
		
		for (i = 0; i < familySymbol.length; i++)
		{
			doc.getTimeline().currentFrame = frs[i];
			familySymbol[i].selected = true;
			doc.enterEditMode("inPlace");
		}

		doc.getTimeline().currentFrame = curFr;
	}
	else
	{
		fl.trace("Operation cancelled");
	}
	
	fl.trace("DONE");
	fl.showIdleMessage(true);
}
else {
	alert("No symbol has been selected");
}

var SPRITEMAP_ID;
var TEMP_SPRITEMAP;
var TEMP_ITEM;
var TEMP_TIMELINE;
var TEMP_LAYER;
var smIndex;

var addedItems;
var frameQueue;

var dictionary;

function exportAtlas(exportPath, symbolNames)
{	
	SPRITEMAP_ID = "__BTA_TEMP_SPRITEMAP_";
	TEMP_SPRITEMAP = SPRITEMAP_ID + "0";
	addedItems = [];
	frameQueue = [];
	smIndex = 0;

	dictionary = [];

	var tmpSymbol = false;
	var symbol;

	if (symbolNames.length == 1)
	{
		symbol = findItem(symbolNames[0]);
	}
	else
	{
		var containerID = SPRITEMAP_ID + "PACKED_SYMBOL";
		lib.addNewItem("graphic", containerID);
		lib.editItem(containerID);

		tmpSymbol = true;
		symbol = findItem(containerID);
		
		var i = 0;
		var startIndex = 0;
		
		while(i < symbolNames.length)
		{
			var tempName = symbolNames[i];
			var frameCount = findItem(tempName).timeline.frameCount - 1;

			var startFrame = symbol.timeline.layers[0].frames[startIndex];
			startFrame.name = tempName;
			startFrame.labelType = "name";

			symbol.timeline.insertFrames(frameCount, false, startIndex);
			symbol.timeline.currentFrame = startIndex;
			lib.addItemToDocument({x: 0, y: 0}, tempName);

			startIndex += frameCount;
			i++;

			if (i <= symbolNames.length)
				symbol.timeline.insertBlankKeyframe(startIndex);
		}
	}

	lib.addNewItem("graphic", TEMP_SPRITEMAP);
	TEMP_ITEM = findItem(TEMP_SPRITEMAP);
	TEMP_TIMELINE = TEMP_ITEM.timeline;
	TEMP_LAYER = TEMP_TIMELINE.layers[0];
	TEMP_TIMELINE.removeFrames(0,0);

	// Write Animation.json
	var animJson = generateAnimation(symbol);
	FLfile.write(path + "/Animation.json", animJson);

	// Add items and fix resolutions
	lib.editItem(TEMP_SPRITEMAP);
	var pos = {x:0, y:0};

	var i = 0;
	var l = frameQueue.length;
	while (i < l)
	{
		var id = frameQueue[i];
		var isBitmapFrame = (typeof id === "string");

		if (isBitmapFrame)
		{
			TEMP_TIMELINE.currentFrame = i;
			lib.addItemToDocument(pos, id);
			if (resolution < 1) {
				var bitmap = TEMP_LAYER.frames[i].elements[0];
				bitmap.scaleX = bitmap.scaleY = resolution;
			}
		}
		/* // TODO: this fucks up the matrix and other crap, will fix later
		else if (resolution != 1)
		{
			var shape = TEMP_LAYER.frames[i].elements[id];
			if (shape.isGroup)
			{
				shape.scaleX *= resolution;
				shape.scaleY *= resolution;
			}
			else
			{
				TEMP_TIMELINE.currentFrame = i;
				doc.selection = [shape];
				doc.convertLinesToFills();

				var elements = TEMP_LAYER.frames[i].elements;
				for (e = 0; e < elements.length; e++) {
					var element = elements[e];
					if (e == id) element.scaleX = element.scaleY = resolution;
				}
			}
		}*/
		
		i++;
	}

	// Generate Spritemap
	var sm = makeSpritemap();
	sm.addSymbol(TEMP_ITEM);

	var smData = {sm: sm, index:0};
	spritemaps = [smData];

	// Divide Spritemap if overflowed
	if (sm.overflowed) {
		divideSpritemap(smData, TEMP_ITEM);
	}
	
	var i = 0;
	while (i < spritemaps.length) {
		var id = SPRITEMAP_ID + i;
		var exportId = (i == 0) ? 1 : Math.abs(i - spritemaps.length - 1);

		exportSpritemap(id, exportPath, spritemaps[i], exportId);
		lib.deleteItem(id);
		i++;
	}
	
	if (tmpSymbol)
		lib.deleteItem(symbol.name);
	
	doc.exitEditMode();
	
	fl.trace("Exported to folder: " + exportPath);
}

var spritemaps;

function divideSpritemap(smData, symbol)
{
	var parent = smData.sm;
	var framesLength = symbol.timeline.layers[0].frames.length;
	var cutFrames = Math.floor(framesLength / 2);

	var nextSmID = SPRITEMAP_ID + spritemaps.length;
	lib.addNewItem("graphic", nextSmID);
	var nextSmSymbol = findItem(nextSmID);

	symbol.timeline.copyFrames(cutFrames, framesLength);
	nextSmSymbol.timeline.pasteFrames(0, (framesLength - cutFrames));
	symbol.timeline.removeFrames(cutFrames, framesLength);

	var nextSm = makeSpritemap();
	var nextSmData = {sm: nextSm, index: cutFrames + smData.index};
	spritemaps.push(nextSmData);
	nextSm.addSymbol(nextSmSymbol);

	parent.removeSymbol(symbol);
	parent.addSymbol(symbol);

	if (parent.overflowed) {
		divideSpritemap(smData, symbol);
	}

	if (nextSm.overflowed) {
		divideSpritemap(nextSmData, nextSmSymbol);
	}
}

function exportSpritemap(id, exportPath, smData, index)
{
	var smPath = exportPath + "/spritemap" + index;
	var smSettings = {format:"png", bitDepth:32, backgroundColor:"#00000000"};
	var sm = smData.sm;
	sm.exportSpriteSheet(smPath, smSettings, true);

	// Parse and change json to spritemap format
	var meta = FLfile.read(smPath + ".json").split("\t").join("").split(" ").join("");
	var atlasLimbs = meta.split(id);
	atlasLimbs.splice(0, 1);

	var smJson = ['{"ATLAS":{"SPRITES":[\n'];

	var l = 0;
	while (l < atlasLimbs.length)
	{
		var limbData = atlasLimbs[l].split("{").join("").split("}").join("").split("\n");
		
		var name = parseInt(formatLimbName(limbData[0].slice(0, -2))) + smData.index;
		var frame = limbData[1].split('"frame":').join("");
		var rotated = limbData[2].slice(0, -1);
		
		smJson.push('{"SPRITE":{"name":"' +  name + '",' + frame + rotated + '}}');
		if (l < atlasLimbs.length - 1) smJson.push(',\n');
		l++;
	}

	smJson.push(']},\n"meta":');

	var metaData = atlasLimbs.pop().split('"meta":')[1];
	metaData = metaData.split(app.split(" ").join("")).join(app + " (Better TA Extension)");
	smJson.push(metaData.split("scale").join("resolution").slice(0, -1));
	
	FLfile.write(smPath + ".json", smJson.join(""));
}

var app = "";
function makeSpritemap() {
	var sm = new SpriteSheetExporter;
	sm.algorithm = "maxRects";
	sm.autoSize = true;
	sm.borderPadding = BrdPad;
	sm.shapePadding = ShpPad;
	sm.allowRotate = true;
	sm.allowTrimming = true;
	sm.stackDuplicate = true;
	sm.layoutFormat = "JSON-Array";
	
	app = sm.app;
	return sm;
}

function generateAnimation(symbol)
{
	initJson();
	push("{\n");
	
	// Add Animation
	jsonHeader(key("ANIMATION", "AN"));
	jsonStr(key("name", "N"), doc.name.slice(0, -4));
	
	if (instance != null) {
		jsonHeader(key("StageInstance", "STI"));
		parseSymbolInstance(instance);
		push('},\n');
	}

	parseSymbol(symbol);
	push('},\n');
	
	// Add Symbol Dictionary
	jsonHeader(key("SYMBOL_DICTIONARY", "SD"));
	jsonArray(key ("Symbols", "S"));
	
	var dictionaryIndex = 0;

	while (true)
	{
		var itemSymbol = findItem(dictionary[dictionaryIndex++]);

		if (itemSymbol == null)
			break;

		push('{\n');
		parseSymbol(itemSymbol);
		push('},');
		
		if (dictionaryIndex > dictionary.length - 1)
			break;
	}

	removeTrail(1);
	push(']},\n');
	
	// Add Metadata
	jsonHeader(key("metadata", "MD"));
	jsonStr(key("version", "V"), BTA_version);
	jsonVarEnd(key("framerate", "FRT"), doc.frameRate);
	push('}}');
	
	return curJson.join("");
}

function parseSymbol(symbol)
{
	var timeline = symbol.timeline;
	var layers = timeline.layers;
	
	jsonStr(key("SYMBOL_name", "SN"), symbol.name);
	jsonHeader(key("TIMELINE", "TL"));
	jsonArray(key("LAYERS", "L"));

	var l = 0;
	while (l < layers.length)
	{
		var layer = layers[l];
		if (layer.visible || !onlyVisibleLayers)
		{
			var lockedLayer = layer.locked;
			layer.locked = false;

			push('{\n');
			jsonStr(key("Layer_name", "LN"), layer.name);

			switch (layer.layerType)
			{
				case "mask":
					jsonStr(key("Layer_type", "LT"), key("Clipper", "Clp"));
				break;
				case "masked":
					jsonStr(key("Clipped_by", "Clpb"), layer.parentLayer.name);
				break;
				case "folder":
					jsonStr(key("Layer_type", "LT"), key("Folder", "Fld"));
					if (layer.parentLayer != undefined)
						jsonStr(key("Parent_layer", "PL"), layer.parentLayer.name);
				break
				// not planning on adding these
				case "guide":
				case "guided":
				case "normal":
				break;
			}

			if (layer.layerType != "folder")
				parseFrames(layer.frames, l, timeline);

			push('},');
			
			layer.locked = lockedLayer;
		}
		l++;
	}

	removeTrail(1);
	push(']}');
}

function parseFrames(frames, layerIndex, timeline)
{
	jsonArray(key("Frames", "FR"));

	var f = 0;
	while (f < frames.length)
	{
		var frame = frames[f];
		if (f == frame.startFrame)
		{
			push('{\n');
		
			if (frame.name.length > 0)
				jsonStr(key("name", "N"), frame.name);
		
			jsonVar(key("index", "I"), frame.startFrame);
			jsonVar(key("duration", "DU"), frame.duration);
			parseElements(frame.elements, frame.startFrame, layerIndex, timeline);
			push('},');
		}
		f++;
	}

	removeTrail(1);
	push(']');
}

function parseElements(elements, frameIndex, layerIndex, timeline)
{
	jsonArray(key("elements", "E"));
	
	var e = 0;
	var shapeQueue = [];

	while (e < elements.length)
	{
		var element = elements[e];
		var elementType = element.elementType;

		var isShape = elementType == "shape";
		if (isShape) isShape = !element.isGroup;

		if (isShape) // Adobe sometimes forgets how their own software works
		{
			shapeQueue.push(e);
		}
		else
		{
			if (shapeQueue.length > 0)
			{
				push("{");
				parseShape(timeline, layerIndex, frameIndex, shapeQueue, true)
				push("},\n");
				shapeQueue = [];
			}

			push("{");
		}
		
		switch (element.elementType)
		{
			case "shape":
				if (element.isGroup)
					parseShape(timeline, layerIndex, frameIndex, [e], false);
			break
			case "instance":
				switch (element.instanceType) {
					case "symbol":
						parseSymbolInstance(element);
					break;
					case "bitmap":
						parseBitmapInstance(element);
					break;
					// TODO: add missing element instance types
					case "embedded video": break;
					case "linked video": break;
					case "video": break;
					case "compiled clip": break;
				}
			break;
			case "text":
				switch (element.textType)
				{
					case "static":
						parseShape(timeline, layerIndex, frameIndex, [e], false);
					break;
					// TODO: add missing text types
					case "dynamic": break;
					case "input": 	break;
				}
			break;
			// TODO: add missing (deprecated) element types
			case "tlfText": 	break;
			case "shapeObj": 	break;
		}

		if (!isShape)
			push((e < elements.length -1) ? "},\n" : "}");
		
		e++;
	}

	if (shapeQueue.length > 0) {
		push("{");
		parseShape(timeline, layerIndex, frameIndex, shapeQueue, true)
		push("}");
	}
	
	push(']');
}

function parseBitmapInstance(bitmap)
{
	var m = bitmap.matrix;
	var matrix = {a:m.a, b:m.b, c:m.c, d:m.d, tx:m.tx, ty:m.ty};

	if (resolution < 1) {
		matrix.a *= resScale;
		matrix.d *= resScale;
	}

	var itemIndex = pushItemSpritemap(bitmap.libraryItem);
	parseAtlasInstance(matrix, itemIndex);
}

function parseShape(timeline, layerIndex, frameIndex, elementIndices, checkMatrix)
{
	var shapes = pushElementSpritemap(timeline, layerIndex, frameIndex, elementIndices);
	var shape = shapes[0];
	var matrix;

	if (checkMatrix)
	{
		var minX = shape.x;
		var minY = shape.y;
		var maxX = shape.x + shape.width;
		var maxY = shape.y + shape.height;

		var s = 1;
		while (s < shapes.length)
		{
			var shape = shapes[s];
			minX = Math.min(minX, shape.x);
        	minY = Math.min(minY, shape.y);
        	maxX = Math.max(maxX, shape.x + shape.width);
        	maxY = Math.max(maxY, shape.y + shape.height);
			s++;
		}
		
		var tx = parseFloat((minX - ((maxX - minX) / 2)).toFixed(3));
		var ty = parseFloat((minY - ((maxY - minY) / 2)).toFixed(3));
		
		matrix = {a: resScale, b: 0, c: 0, d: resScale, tx: tx, ty: ty}
	}
	else
	{
		matrix = cloneMatrix(shape.matrix);
		matrix.a *= resScale;
		matrix.d *= resScale;
	}
	
	parseAtlasInstance(matrix, smIndex - 1);
}

function parseAtlasInstance(matrix, name)
{
	jsonHeader(key("ATLAS_SPRITE_instance", "ASI"));
	jsonVar(key("Matrix", "MX"), parseMatrix(matrix));
	jsonStrEnd(key("name", "N"), name);
	push('}');
}

function pushItemSpritemap(item)
{
	var name = item.name;
	var index = addedItems.indexOf(name);
	
	if (index == -1) {
		TEMP_TIMELINE.insertBlankKeyframe(smIndex);
		addedItems.push(name);
		frameQueue.push(name);
		index = addedItems.length - 1;
		smIndex++;
	}

	return index;
}

function pushElementSpritemap(timeline, layerIndex, frameIndex, elementIndices)
{
	timeline.setSelectedLayers(layerIndex, true);
	timeline.copyFrames(frameIndex, frameIndex);
	TEMP_TIMELINE.pasteFrames(smIndex);

	var frameElements = TEMP_LAYER.frames[smIndex].elements;
	var shape = frameElements[elementIndices[0]];
	var shapes = [];

	var e = 0;
	var ei = 0;
	var lastWidth = -1;

	while (e < frameElements.length)
	{
		var frameElement = frameElements[e];

		if (elementIndices[ei] == e) // Add the actual parts of the array
		{
			ei++;

			// TODO: move this to the frameQueue and fix the resolution lines bug
			// Gotta check because its both the same shape instance but also not?? Really weird shit
			if (Math.round(frameElement.width) != lastWidth)
			{
				// Gotta do this because jsfl scripts cant keep track well of instances data and will randomly corrupt values
				shapes.push({
					x: frameElement.x, y: frameElement.y,
					width: frameElement.width, height: frameElement.height,
					matrix: frameElement.matrix
				});
				
				frameElement.matrix = matrixIdent(frameElement.matrix);
				frameElement.width *= resolution;
				frameElement.height *= resolution;
				lastWidth = Math.round(frameElement.width);
			}
		}
		else // Remove other crap from the frame
		{
			frameElement.width = frameElement.height = 0;
			frameElement.x = shape.x;
			frameElement.y = shape.y;
		}

		e++;
	}

	//frameQueue.push(smIndex);
	smIndex++;

	return shapes;
}

function parseSymbolInstance(instance)
{
	jsonHeader(key("SYMBOL_Instance", "SI"));
	var item = instance.libraryItem;
	
	if (item != undefined) {
		jsonStr(key("SYMBOL_name", "SN"), item.name);
		if (dictionary.indexOf(item.name) == -1)
			dictionary.push(item.name);
	}

	if (instance.firstFrame != undefined)
		jsonVar(key("firstFrame", "FF"), instance.firstFrame);
	
	if (instance.symbolType != undefined) {
		var type;
		switch (instance.symbolType) {
			case "graphic": 	type = key("graphic", "G"); 	break
			case "movie clip": 	type = key("movieclip", "MC"); 	break;
			case "button": 		type = key("button", "B"); 		break;
		}
		jsonStr(key("symbolType", "ST"), type);
	}
	
	jsonHeader(key("transformationPoint", "TRP"));
	jsonVar("x", instance.transformX);
	jsonVarEnd("y", instance.transformY);
	push("},\n");

	if (instance.colorMode != "none") {
		jsonHeader(key("color", "C"));
		var modeKey = key("mode", "M");
		
		switch (instance.colorMode) {
			case "brightness":
				jsonStr(modeKey, key("Brightness", "CBRT"));
				jsonVarEnd(key("brightness", "BRT"), instance.brightness);
			break;
			case "tint":
				jsonStr(modeKey, key("Tint", "T"));
				jsonStr(key("tintColor", "TC"), instance.tintColor);
				jsonVarEnd(key("tintMultiplier", "TM"), instance.tintPercent / 100);
			break;
			case "alpha":
				jsonStr(modeKey, key("Alpha", "CA"));
				jsonVarEnd(key("alphaMultiplier", "AM"), instance.colorAlphaPercent / 100);
			break;
			case "advanced":
				jsonStr(modeKey, key("Advanced", "AD"));
				jsonVar(key("RedMultiplier", "RM"), instance.colorRedPercent / 100);
				jsonVar(key("greenMultiplier", "GM"), instance.colorGreenPercent / 100);
				jsonVar(key("blueMultiplier", "BM"), instance.colorBluePercent / 100);
				jsonVar(key("alphaMultiplier", "AM"), instance.colorAlphaPercent / 100);
				jsonVar(key("redOffset", "RO"), instance.colorRedAmount);
				jsonVar(key("greenOffset", "GO"), instance.colorGreenAmount);
				jsonVar(key("blueOffset", "BO"), instance.colorBlueAmount);
				jsonVarEnd(key("AlphaOffset", "AO"), instance.colorAlphaAmount);
			break;
		}

		push('},\n');
	}
	
	if (instance.name.length > 0)
		jsonStr(key("Instance_Name", "IN"), instance.name);
	
	if (instance.loop != undefined) {
		var loop;
		switch (instance.loop) {
			case "play once": 		loop = key("playonce", "PO"); 		break;
			case "single frame":	loop = key("singleframe", "SF");	break;
			case "loop": 			loop = key("loop", "LP");			break;
		}
		jsonStr(key("loop", "LP"), loop);
	}
	
	if (instance.is3D)	jsonVar(key("Matrix3D", "M3D"), parseMatrix3D(instance.matrix3D));
	else				jsonVar(key("Matrix", "MX"), 	parseMatrix(instance.matrix));	

	if (instance.symbolType != "graphic")
	{
		var filters = instance.filters;
		var hasFilters = (filters != undefined && filters.length > 0)

		if (instance.blendMode != "normal")
			jsonStr(key("blend", "B"), instance.blendMode);
		
		// Add Filters
		if (hasFilters)
		{
			jsonArray(key("filters", "F"));
			var n = key("name", "N");

			var i = 0;
			while (i < filters.length)
			{
				var filter = filters[i];

				push('{\n');

				switch (filter.name) {
					case "adjustColorFilter":
						jsonStr(n, key("adjustColorFilter", "ACF"));
						jsonVar(key("brightness", "BRT"), filter.brightness);
						jsonVar(key("hue", "H"), filter.hue);
						jsonVar(key("contrast", "CT"), filter.contrast);
						jsonVarEnd(key("saturation", "SAT"), filter.saturation);
					break;
					case "bevelFilter":
						jsonStr(n, key("bevelFilter", "BF"));
						jsonVar(key("blurX", "BLX"), filter.blurX);
						jsonVar(key("blurY", "BLY"), filter.blurY);
						jsonVar(key("distance", "D"), filter.distance);
						jsonVar(key("knockout", "KK"), filter.knockout);
						jsonStr(key("type", "T"), filter.type);
						jsonVar(key("strength", "STR"), filter.strength);
						jsonVar(key("angle", "A"), filter.angle);
						jsonStr(key("shadowColor", "SC"), filter.shadowColor);
						jsonStr(key("highlightColor", "HC"), filter.highlightColor);
						jsonVarEnd(key("quality", "Q"), parseQuality(filter.quality));
					break;
					case "blurFilter":
						jsonStr(n, key("blurFilter", "BLF"));
						jsonVar(key("blurX", "BLX"), filter.blurX);
						jsonVar(key("blurY", "BLY"), filter.blurY);
						jsonVarEnd(key("quality", "Q"), parseQuality(filter.quality));
					break;
					case "dropShadowFilter":
						jsonStr(n, key("dropShadowFilter", "DSF"));
						jsonVar(key("blurX", "BLX"), filter.blurX);
						jsonVar(key("blurY", "BLY"), filter.blurY);
						jsonVar(key("distance", "D"), filter.distance);
						jsonVar(key("knockout", "KK"), filter.knockout);
						jsonVar(key("inner", "IN"), filter.inner);
						jsonVar(key("hideObject", "HO"), filter.hideObject);
						jsonVar(key("strength", "STR"), filter.strength);
						jsonVar(key("angle", "A"), filter.angle);
						jsonStr(key("color", "C"), filter.color);
						jsonVarEnd(key("quality", "Q"), parseQuality(filter.quality));
					break;
					case "glowFilter":
						jsonStr(n, key("glowFilter", "GF"));
						jsonVar(key("blurX", "BLX"), filter.blurX);
						jsonVar(key("blurY", "BLY"), filter.blurY);
						jsonVar(key("inner", "IN"), filter.inner);
						jsonVar(key("knockout", "KK"), filter.knockout);
						jsonVar(key("strength", "STR"), filter.strength);
						jsonStr(key("color", "C"), filter.color);
						jsonVarEnd(key("quality", "Q"), parseQuality(filter.quality));
					break;
					case "gradientBevelFilter":
						jsonStr(n, key("gradientBevelFilter", "GBF"));
						jsonVar(key("blurX", "BLX"), filter.blurX);
						jsonVar(key("blurY", "BLY"), filter.blurY);
						jsonVar(key("distance", "D"), filter.distance);
						jsonVar(key("knockout", "KK"), filter.knockout);
						jsonStr(key("type", "T"), filter.type);
						jsonVar(key("strength", "STR"), filter.strength);
						jsonVar(key("angle", "A"), filter.angle);
						jsonVar(key("colorArray", "CA"), parseArray(filter.colorArray));
						jsonVarEnd(key("quality", "Q"), parseQuality(filter.quality));
					break;
					case "gradientGlowFilter":
						jsonStr(n, key("gradientGlowFilter", "GGF"));
						jsonVar(key("blurX", "BLX"), filter.blurX);
						jsonVar(key("blurY", "BLY"), filter.blurY);
						jsonVar(key("inner", "IN"), filter.inner);
						jsonVar(key("knockout", "KK"), filter.knockout);
						jsonVar(key("strength", "STR"), filter.strength);
						jsonVar(key("colorArray", "CA"), parseArray(filter.colorArray));
						jsonVarEnd(key("quality", "Q"), parseQuality(filter.quality));
					break;
				}

				push((i < filters.length - 1) ? '},' : '}\n');
				i++;
			}
			
			push(']\n');
		}
		else removeTrail(2);
	}
	else removeTrail(2);

	push('}');
}

function matrixIdent(mat)
{
	mat.a = mat.d = 1;
	mat.b = mat.c = mat.tx = mat.ty = 0;
	return mat;
}

function cloneMatrix(mat)
{
	return {a: mat.a, b: mat.b, c: mat.c, d: mat.d, tx: mat.tx, ty: mat.ty}
}

function parseMatrix(m) {
	return "[" +
	m.a + "," +
	m.b + "," +
	m.c + "," +
	m.d + "," +
	m.tx + "," +
	m.ty +
	"]"; 
}

function parseMatrix3D(m) {
	return "[" +
	m.m00 + "," +
	m.m01 + "," +
	m.m02 + "," +
	m.m03 + "," +
	m.m10 + "," +
	m.m11 + "," +
	m.m12 + "," +
	m.m13 + "," +
	m.m20 + "," +
	m.m21 + "," +
	m.m22 + "," +
	m.m23 + "," +
	m.m30 + "," +
	m.m31 + "," +
	m.m32 + "," +
	m.m33 +
	"]";
}

function parseArray(array) {
	return '["' + array.join('","') +'"]';
}

function parseQuality(quality) {
	if (quality == "low") return 1;
	if (quality == "medium") return 2;
	return 3;
}

function formatLimbName(numStr) {
    var i = 0;
    while (i < numStr.length && numStr[i] === '0') {
        i++;
    }
    return i === numStr.length ? "0" : numStr.slice(i);
}

function formatPath(path)
{
	// All good here im gonna assume
	if (path.split("file:///").length > 1) {
		return path;
	}

	var arr = path.split("\\");

	arr = arr.join("\\").split(":");
		
	path = "file:///" + arr.join("|");
	path = path.split("\\").join("/");

	// Remove leading spaces of the path
	var endIndex = path.length - 1;
	while (endIndex >= 0 && path[endIndex] === ' ') {
		endIndex--;
	}

	return path.substring(0, endIndex + 1);
}

function findItem(name) {
	if (lib.itemExists(name))
		return lib.items[lib.findItemIndex(name)];

	fl.trace("Item not found: " + name);
	return null;
}

function key(normal, optimized) {
	return optimizeJson ? optimized : normal;
}

function jsonVarEnd(name, value)	{ push('"' + name +'":' + value + '\n'); }
function jsonVar(name, value)		{ push('"' + name +'":' + value + ',\n'); }
function jsonStrEnd(name, value)	{ push('"' + name + '":"' + value + '"\n'); }
function jsonStr(name, value)		{ push('"' + name + '":"' + value + '",\n'); }
function jsonArray(name)			{ push('"' + name + '":[\n'); }
function jsonHeader(name)			{ push('"' + name + '":{\n'); }

function measure(func)
{
	var last = Date.now();
	func();
	fl.trace("" + (Date.now() - last) + "ms");
}

var curJson;

function initJson()
{
	curJson = [];
}

function push(data)
{
	curJson.push(data);
}

function removeTrail(trail)
{
	var l = curJson.length -1;
	curJson[l] = curJson[l].slice(0, -trail) + "\n";
}
