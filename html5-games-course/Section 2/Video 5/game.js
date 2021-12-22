// JavaScript Document
class Game{
	constructor(){
    	this.canvas = document.getElementById("game");
		this.context = this.canvas.getContext("2d");
		this.context.font="30px Verdana";
		this.sprites = [];
		
		const game = this;
		this.loadJSON("flowers", function(data, game){
			game.spriteData = JSON.parse(data);
			game.spriteImage = new Image();
			game.spriteImage.src = game.spriteData.meta.image;
			game.spriteImage.onload = function(){	
				game.init();
			}
		})
	}
	
	loadJSON(json, callback) {   
		var xobj = new XMLHttpRequest();
			xobj.overrideMimeType("application/json");
		xobj.open('GET', json + '.json', true); // Replace 'my_data' with the path to your file
		const game = this;
		xobj.onreadystatechange = function () {
			  if (xobj.readyState == 4 && xobj.status == "200") {
				// Required use of an anonymous callback as .open will NOT return a value but simply returns undefined in asynchronous mode
				callback(xobj.responseText, game);
			  }
		};
		xobj.send(null);  
	 }
	
	init(){
		this.score = 0;
		this.lastRefreshTime = Date.now();
		this.spawn();
		this.refresh();
			
		const game = this;
		
		function tap(evt){
			game.tap(evt);
		}
		
		if ('ontouchstart' in window){
			this.canvas.addEventListener("touchstart", tap, supportsPassive ? { passive:true } : false );
		}else{
			this.canvas.addEventListener("mousedown", tap);
		}
	}
	
	refresh() {
		const now = Date.now();
		const dt = (now - this.lastRefreshTime) / 1000.0;

		this.update(dt);
		this.render();

		this.lastRefreshTime = now;
		
		const game = this;
		requestAnimationFrame(function(){ game.refresh(); });
	}
	
	getMousePos(evt) {
        const rect = this.canvas.getBoundingClientRect();
		const clientX = evt.targetTouches ? evt.targetTouches[0].pageX : evt.clientX;
		const clientY = evt.targetTouches ? evt.targetTouches[0].pageY : evt.clientY;
		
		const canvasScale = this.canvas.width / this.canvas.offsetWidth;
		const loc = {};
		
		loc.x = (clientX - rect.left) * canvasScale;
		loc.y = (clientY - rect.top) * canvasScale;
		
        return loc;
    }
	
	tap (evt) {
		const mousePos = this.getMousePos(evt);
		
		for (let sprite of this.sprites) {
			if (sprite.hitTest(mousePos)){
				sprite.kill = true;
				this.score++;
			}
		}
	}
	
	update(dt){
		this.sinceLastSpawn += dt;
		if (this.sinceLastSpawn>1) this.spawn();
		let removed;
		do{
			removed = false;
			for(let sprite of this.sprites){
				if (sprite.kill){
					const index = this.sprites.indexOf(sprite);
					this.sprites.splice(index, 1);
					removed = true;
					break;
				}
			}
		}while(removed);
		
		for(let sprite of this.sprites){
			if (sprite==null) continue;
			sprite.update(dt);
		}
	}
	
	spawn(){
		const index = Math.floor(Math.random() * 5);
		const frame = this.spriteData.frames[index].frame;
		const sprite = new Sprite({
			context: this.context,
			x: Math.random() * this.canvas.width,
			y: Math.random() * this.canvas.height,
			index: index,
			frame: frame,	
			anchor: { x:0.5, y:0.5 },
			image: this.spriteImage,
			states: [ { mode:"spawn", duration: 0.5 }, {mode:"static", duration:1.5}, {mode:"die", duration:0.8} ]
		});
		
		this.sprites.push(sprite);
		this.sinceLastSpawn = 0;	
	}
	
	render(){
		this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
		
		for(let sprite of this.sprites){
			sprite.render();
		}
		
		this.context.fillText("Score: " + this.score, 150, 30);
	}
}

class Sprite{
	constructor(options){
		this.context = options.context;
		this.image = options.image;
		this.index = options.index;
		this.frame = options.frame;
		this.x = options.x;
		this.y = options.y;
		this.anchor = (options.anchor==null) ? { x:0.5, y:0.5 } : options.anchor;
		this.states = options.states;
        this.state = 0;
		this.scale = (options.scale==null) ? 1.0 : options.scale;
		this.opacity = (options.opacity==null) ? 1.0 : options.opacity;
		this.currentTime = 0;
		this.kill = false;
	}

	set state(index){
        this.stateIndex = index;
        this.stateTime = 0;
    }
    
    get state(){
        let result;
        
        if (this.stateIndex<this.states.length) result = this.states[this.stateIndex];
        
        return result;
    }
		
	hitTest(pt){
		const centre = { x: this.x, y: this.y };
		const radius = (this.frame.w * this.scale) / 2;
		//Now test if the pt is in the circle
		const dist = distanceBetweenPoints(pt, centre);

		return (dist<radius);
		
		function distanceBetweenPoints(a, b){
			var x = a.x - b.x;
			var y = a.y - b.y;
			
			return Math.sqrt(x * x + y * y);
		}
	}
		
	update(dt){
		this.stateTime += dt;
		const state = this.state;
		if (state==null){
			this.kill = true;
			return;
		}
		const delta = this.stateTime/state.duration;
        if (delta>1) this.state = this.stateIndex + 1;

		switch(state.mode){
			case "spawn":
				//scale and fade in
				this.scale = delta;
				this.opacity = delta;
				break;
			case "static":
				this.scale = 1.0;
				this.opacity = 1.0;
				break;
			case "die":
				this.scale = 1.0 + delta;
				this.opacity = 1.0 - delta;
                if (this.opacity<0) this.opacity = 0;
				break;
		}
	}
	
	render() {
		// Draw the animation
		const alpha = this.context.globalAlpha;
			
		this.context.globalAlpha = this.opacity;
		
		this.context.drawImage(
		   this.image,
		   this.frame.x,
		   this.frame.y,
		   this.frame.w,
		   this.frame.h,
		   this.x - this.frame.w * this.scale * this.anchor.x,
		   this.y - this.frame.h * this.scale * this.anchor.y,
		   this.frame.w * this.scale,
		   this.frame.h * this.scale);
		
		this.context.globalAlpha = alpha;
	}
}