use std::{collections::HashMap, env, sync::Arc};

use axum::{extract::{Path, State}, routing::{delete, get, post}, Json, Router};
use tokio::sync::Mutex;
use tower_http::cors::{Any, CorsLayer};

// This relay server connects participants of a video confrencing room and allows messages to be send back and forth
// messages, audio, and other pieces of media (e.g. audio generated from signs, video generated from speech).
// This is entirely ephemeral for privacy purposes (there's no real reason to store the conversation log),
// and because conversations are not expected to span server restarts. However if the user desires, this can easily
// be amended to hook up some kind of database rather than using a hashmap.
// Do note that this currently does not have any ability to screen the user (e.g. ensure that a user should
// have access to a given room), though that could easily be altered.
#[tokio::main]
async fn main() {
    let state = Arc::new(Mutex::new(HashMap::<String, Vec<(String, String, String)>>::new()));
    let app: Router = Router::new()
        .route(
            "/conversation/:room_id",
            get(get_conversation_log)
        )
        .route(
            "/conversation/:room_id",
            post(insert_into_conversation_log)
        )
        .route(
            "/conversation/:room_id",
            delete(clear_conversation_log)
        )
        .route(
            "/health",
            get(health)
        )
        .layer(
            CorsLayer::new()
                .allow_methods(Any)
                .allow_headers(Any)
                .allow_origin(Any)
        )
        .with_state(state);

    let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{}", env::var("PORT").expect("Must specify port to run on"))).await.expect("Must be able to bind to specified port");
    axum::serve(listener, app).await.expect("Application hit fatal error");
}

async fn get_conversation_log(
    State(state): State<Arc<Mutex<HashMap<String, Vec<(String, String, String)>>>>>,
    Path(req_id): Path<String>
) -> Json<Vec<(String, String, String)>>{
    let mut locked = state.lock().await;
    if let Some(val) = locked.get(&req_id) {
        return Json(val.to_owned());
    } else {
        let empty_log = vec![];
        locked.insert(req_id, empty_log.to_owned());
        return Json(empty_log);
    }
}

async fn insert_into_conversation_log(
    State(state): State<Arc<Mutex<HashMap<String, Vec<(String, String, String)>>>>>,
    Path(req_id): Path<String>,
    Json(message): Json<(String, String, String)>
) {
    let mut locked = state.lock().await;
    if let Some(entry) = locked.get_mut(&req_id) {
        entry.push(message);
    } else {
        let empty_log = vec![message];
        locked.insert(req_id, empty_log.to_owned());
    }
}

async fn clear_conversation_log(
    State(state): State<Arc<Mutex<HashMap<String, Vec<(String, String, String)>>>>>,
    Path(req_id): Path<String>
) {
    let mut locked = state.lock().await;
    locked.remove(&req_id);
}
async fn health(
    State(state): State<Arc<Mutex<HashMap<String, Vec<(String, String, String)>>>>>,
) -> String {
    "Healthy".to_string()
}
