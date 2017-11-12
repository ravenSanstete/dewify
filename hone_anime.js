(function (){
    var PATH = 'motions/10_01.json';
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(
      75, 2, 0.1, 1000
    );


    var renderer = new THREE.WebGLRenderer({
      // alpha: true
      antialias: true
    });
    renderer.setClearColor(0x691919, 1);
    renderer.setSize(1000, 1000);
    document.getElementById('container').appendChild(renderer.domElement);

    // morino saikko
    // set the light
    var ambientLight = new THREE.AmbientLight(0xffffff, 1);
    var pointLight = new THREE.PointLight(0xffffff, 1, 10, 2);
    pointLight.position.set(0, 1.4, 3.4);
    scene.add(pointLight, ambientLight);

    // set the camera
    camera.position.set(0, 0, 2);

    var JNT_COLOR = '#476490';
    var JNT_SCALE = 0.5;
    var ROOT_ID = 0;
    var DOF = 6;


    // A MAYBE DANGEROUS BUT USEFUL FUNCTION
    Array.prototype.resize = function(newSize, defaultValue) {
      while(newSize > this.length)
          this.push(defaultValue);
      this.length = newSize;
    }


    // the parsing order for transf is [X, Y, Z, Z_ROT, Y_ROT, X_ROT]
    function calculate_local_mat(transf){
        console.log(transf);
        //fill the array
        while(DOF > transf.length)
            transf.push(0.0);

        q_rot = quat.create();
        quat.fromEuler(q_rot, transf[5], transf[4], transf[3]);
        local_mat = mat4.create();
        mat4.fromRotationTranslation(local_mat, q_rot, vec3.fromValues(transf[0], transf[1], transf[2]));
        return local_mat;
    }


    /**
    NOTE : IMPORTANT FUNC.
      one of the most important function in this script, for generating the skeletal animation from the json log file,
      which should start an animation function, after adding each node with links into the scene
    **/
    function Bone(ost, chn_num, ds, pid){
        this.inverse_bind_pos = mat4.create();
        this.world_matrix = mat4.create(); //store this because the children needs the parent's world matrix for transformation
        this.offset_matrix = mat4.create();
        // the following two entries for a faster addressing of the frame data
        this.ost = ost;
        this.len = chn_num;
        this.ds = ds;
        this.pid = pid;
        this.mesh = new THREE.Mesh(new THREE.SphereGeometry(JNT_SCALE, JNT_SCALE, JNT_SCALE), new THREE.MeshLambertMaterial({color: '#476490'}));
    }


    function play_hone_anime(mocap, scene){
      var mapping = {};

      var internal_cnt = 0;
      var bones = {};
      var trav_order = [];
      var ost = 0;

      // SETUP the data structure and etc.
      for(var i = 0; i < mocap['hierarchy'].length; i++){
        var pid = mocap['hierarchy'][i]['parent_id'];
        var id = mocap['hierarchy'][i]['id'];
        var chn_num = mocap['hierarchy'][i]['chn_num'];
        // create my own structure wrapping the THREE.js's mesh type
        bones[id] = new Bone(ost, chn_num, mocap['hierarchy'][i]['offsets'], pid); //chn_num always greater than zero
        ost += chn_num;

        if(pid < 0) continue;
        if(!(pid in mapping)){
          mapping[pid] = [];
          internal_cnt ++;

        }
        mapping[pid].push(id);
      }

      q = [ROOT_ID];
      while(q.length != 0){
        h = q.shift();
        if(h in mapping){
          q = q.concat(mapping[h]);
        }

        trav_order.push(h);
      }

      //sorting the tree into a list of topo-order
      console.log(bones);
      console.log(trav_order);

      // calculate the inverse bind matrix with the first frame information
      var delay = mocap['motion']['frame_time'] * 1000; //let it to be of milli-sec dim
      var origin_frame = mocap['motion']['frames'][0];
      var local_mat;
      for(var i = 0; i < trav_order.length; i++){
        var cur = trav_order[i];
        if(cur == ROOT_ID)
          local_mat = calculate_local_mat(origin_frame.slice(bones[cur].ost, bones[cur].ost + bones[cur].len));
        else
          local_mat = calculate_local_mat(bones[cur].ds.concat(origin_frame.slice(bones[cur].ost, bones[cur].ost + bones[cur].len)));

        if(cur == ROOT_ID)
          bones[cur].world_matrix = local_mat;
        else
          mat4.multiply(bones[cur].world_matrix, bones[bones[cur].pid].world_matrix, local_mat);
        

        mat4.invert(bones[cur].inverse_bind_pos, bones[cur].world_matrix);
      }

      console.log(bones);








      return;
    }



    // add group2 into the scene and render it , only for testing.

    /*
    var group2 = new THREE.Object3D();

    var mesh1 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), new THREE.MeshLambertMaterial({color: '#d2a43f'}));
    mesh1.position.set(-1, 0, 0);

    var mesh2 = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 16), new THREE.MeshLambertMaterial({color: '#476490'}));
    mesh2.position.set(1, 0, 0);

    group2.add(mesh1, mesh2);
    scene.add(group2);
    */

    (function() {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', PATH, false);
        xhr.send();

        // the raw data for morino's application to visualize and do other things
        var mocap = JSON.parse(xhr.responseText);

        // it is easy to see the hierarchy is of the form of a tree.
        // we first construct a dictionary for each internal node mapping their id to their children for later usage
        play_hone_anime(mocap, scene);


        //console.log(mocap);

    }());


    function startAnimation() {
      /*
      new TWEEN.Tween(mesh1.position).to({x: [-0.5, -2]}, 1000).easing(TWEEN.Easing.Quadratic.InOut).delay(3000).start();
      new TWEEN.Tween(mesh2.position).to({x: [1.5, 0]}, 1000).easing(TWEEN.Easing.Quadratic.InOut).delay(3500).start();
      */
    }


    function render() {
      requestAnimationFrame(render);
      renderer.render(scene, camera);

      TWEEN.update();
    }


    render();
    startAnimation();
  })();
